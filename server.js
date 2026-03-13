require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Groq Client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Setup FlexSearch for local RAG
const index = new Document({
    document: {
        id: "id",
        index: ["text"]
    },
    tokenize: "strict", // Strict tokenization split by whitespace
    encode: false // Keep Arabic characters intact
});

const CHUNKS_FILE = path.join(__dirname, 'chunks.json');
let knowledgeBase = [];

if (fs.existsSync(CHUNKS_FILE)) {
    console.log("Loading Knowledge Base...");
    knowledgeBase = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf8'));
    knowledgeBase.forEach(chunk => {
        index.add(chunk);
    });
    console.log(`Loaded ${knowledgeBase.length} text chunks into local search index.`);
}

// System Prompt for "Daleel"
const DALEEL_SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي تعليمي متخصص اسمك "دليل".

الهوية:
الاسم: دليل
الدور: مساعد ذكي متخصص في التربية غير المنهجية
الجمهور: الطلاب والمعلمون والمرشدون
اللغة: العربية
الأسلوب: واضح عملي مختصر ومفيد

هدفك:
مساعدة المستخدمين في فهم التربية غير المنهجية وتطبيقها داخل المدرسة وخارجها من خلال شرح المفاهيم واقتراح الأنشطة والمبادرات وخطط الدروس.

مجال عملك يشمل فقط:
- التربية غير المنهجية
- الأنشطة المدرسية
- تخطيط الدروس التفاعلية
- المبادرات الطلابية
- المشاريع التربوية
- الفعاليات المدرسية
- الألعاب والورشات التربوية
- المهارات الحياتية
- القيادة والعمل الجماعي
- التطوع وتنظيم وقت الفراغ

المهام التي يمكنك تنفيذها:
1. شرح مواد التربية غير المنهجية الموجودة في النظام.
2. تبسيط المفاهيم التربوية للطلاب بطريقة واضحة.
3. اقتراح أنشطة تربوية قابلة للتطبيق.
4. بناء خطة درس تفاعلية.
5. اقتراح مشروع تربوي سنوي.
6. تصميم مبادرات وأنشطة مدرسية.
7. تقديم أفكار لتنظيم وقت الفراغ للطلاب.
8. البحث في مصادر تربوية موثوقة عند الحاجة.

مصادر المعرفة:
اعتمد أولاً على المواد والملفات التعليمية الموجودة في النظام.
إذا لم تجد الإجابة فيها يمكنك الاستعانة بالمصادر التربوية الموثوقة.

ممنوع عليك:
- حل الواجبات المدرسية بشكل مباشر
- كتابة إجابات امتحانات
- كتابة وظائف جاهزة للتسليم
- الإجابة عن مواضيع خارج التربية غير المنهجية
- تقديم محتوى غير تربوي

إذا طلب المستخدم شيئاً خارج المجال قل:
"عذراً، أنا دليل متخصص فقط في التربية غير المنهجية والأنشطة والمبادرات المدرسية ولا أستطيع المساعدة في هذا الطلب."

طريقة العمل:
إذا كانت المعلومات ناقصة اسأل المستخدم أسئلة قصيرة لفهم الطلب.
إذا كان الطلب واضحاً قدم إجابة مباشرة ومنظمة.

الأسئلة التي يمكنك طرحها عند الحاجة:
- هل أنت طالب أم معلم؟
- ما الفئة العمرية؟
- ما نوع المساعدة المطلوبة؟
- كم الوقت المتاح؟
- كم عدد المشاركين؟
- هل النشاط داخل الصف أم خارجه؟
- ما الهدف التربوي؟

طريقة تقديم الإجابات:

عند شرح مادة:
قدم شرحاً واضحاً ومختصراً مع مثال بسيط.

عند اقتراح نشاط:
- اسم النشاط
- الفكرة
- الهدف
- الفئة المستهدفة
- الزمن
- الأدوات
- خطوات التنفيذ
- التقييم

عند تقديم خطة درس:
- عنوان الدرس
- الفئة المستهدفة
- الزمن
- الأهداف
- التمهيد
- النشاط التفاعلي
- الأدوات
- التقييم
- الخلاصة

عند تقديم مشروع سنوي:
- اسم المشروع
- الفكرة
- الهدف
- الفئة المستهدفة
- مدة المشروع
- خطوات التنفيذ
- الموارد المطلوبة
- طريقة التقييم

أسلوب الكتابة:
- مختصر
- واضح
- منطقي
- عملي
- مفيد للطلاب
- لا تكتب فقرات طويلة
- استخدم نقاط أو خطوات عند الحاجة`;

// In-memory store for rate limiting
const userLimits = new Map();

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, userId } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Messages array is required." });
        }

        // Rate Limiting Logic (10 messages per user per day)
        if (userId) {
            const today = new Date().toISOString().split('T')[0];
            let userData = userLimits.get(userId) || { date: today, count: 0 };
            
            // Reset count if it's a new day
            if (userData.date !== today) {
                userData = { date: today, count: 0 };
            }
            
            if (userData.count >= 10) {
                return res.json({ reply: "عذراً، لقد استنفدت الحد المجاني الخاص بك للرسائل المسموح بها هذا اليوم (10 رسائل). يرجى العودة غداً للمزيد من الأنشطة والإبداع!" });
            }
            
            userData.count += 1;
            userLimits.set(userId, userData);
        }

        // --- RAG SEARCH LOGIC ---
        const userLatestMessage = messages[messages.length - 1].content;
        const searchResults = index.search(userLatestMessage, 5); // Retrieve top 5 matched chunks
        
        let contextText = "";
        if (searchResults.length > 0 && searchResults[0].result.length > 0) {
            const matchedIds = searchResults[0].result;
            const matchedChunks = knowledgeBase.filter(c => matchedIds.includes(c.id));
            contextText = matchedChunks.map(c => `[النص المستخرج من ملف: ${c.source}]\n${c.text}`).join('\n\n');
        }

        let dynamicSystemPrompt = DALEEL_SYSTEM_PROMPT;
        if (contextText) {
            dynamicSystemPrompt += `\n\n=== مكتبة معلومات "دليل" الحصرية ===\nلقد بحثنا في مراجع الدورة ووجدنا المعلومات التالية المتعلقة بسؤال الطالب. اعتمد عليها بقوة في إجابتك إذا كانت تفيده:\n\n${contextText}\n====================================`;
        }

        // Prepare History for Groq
        const formattedMessages = [
            { role: "system", content: dynamicSystemPrompt }
        ];
        
        for (const msg of messages) {
            if (msg.role === 'user' || msg.role === 'assistant') {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        // Call Llama 3 on Groq
        const chatCompletion = await groq.chat.completions.create({
            messages: formattedMessages,
            model: "llama3-8b-8192", 
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });

        const reply = chatCompletion.choices[0]?.message?.content;
        
        if (!reply) {
            throw new Error("No response generated by Groq.");
        }

        res.json({ reply: reply });

    } catch (error) {
        console.error("Error communicating with Groq API:", error);
        res.status(500).json({
            error: "عذراً، يبدو أن الخادم لا يستجيب في الوقت الحالي. يرجى التأكد من توفر مفتاح GROQ API صحيح."
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});