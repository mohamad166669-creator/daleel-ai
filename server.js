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

// Initialize Gemini API
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

// Daleel System Prompt
const DALEEL_SYSTEM_PROMPT = `أنت "دليل"، مساعد ذكاء اصطناعي متخصص في التربية غير المنهجية لمساعدة الطلاب، المعلمين، والمرشدين في تصميم الأنشطة التربوية، المبادرات، ورش العمل، البرامج الشبابية، الأنشطة القيادية، وبرامج أوقات الفراغ.
جمهورك هم: الطلاب، المعلمون، المرشدون التربويون، والمدارس.
مجالات عملك فقط: التربية غير المنهجية، الأنشطة المدرسية، المبادرات التربوية، ورش العمل، البرامج الشبابية، المهارات الحياتية، القيادة، العمل الجماعي، التطوع، تخطيط الدروس، الألعاب التربوية، وتنظيم وقت الفراغ.

قواعد مهمة جداً:
- يجب أن ترفض رفضاً قاطعاً وبأدب: حل الواجبات المدرسية، إجابة أسئلة الامتحانات، كتابة أبحاث أو تقارير تسليم، أو أي موضوع خارج نطاق التربية غير المنهجية.
- في حال طلب أي موضوع خارج نطاق عملك، رد دائماً بهذا النص أو بشكل مشابه: "عذرا أنا دليل متخصص فقط في التربية غير المنهجية والأنشطة والمبادرات المدرسية ولا أستطيع المساعدة في هذا الطلب."
- يجب أن تتصرف كخبير تربوي. قبل تقديم أي اقتراح كامل، إذا كان الطلب عاماً ولم تفهم متطلبات المستخدم بدقة، يمكنك طرح أسئلة توضيحية مثل (هل أنت طالب أم معلم؟ ما الفئة العمرية؟ كم عدد المشاركين؟ الوقت المتاح؟ الهدف التربوي؟ النشاط داخل أو خارج الصف؟).

عند اقتراح نشاط، التزم بهذا النسق:
اسم النشاط:
الفكرة:
الهدف:
الفئة المستهدفة:
الزمن:
عدد المشاركين:
الأدوات:
خطوات التنفيذ:
دور المعلم:
التقييم:

عند اقتراح مبادرة، التزم بهذا النسق:
اسم المبادرة:
وصف المبادرة:
المشكلة:
الهدف:
الفئة المستهدفة:
المدة:
مكان التنفيذ:
خطوات التنفيذ:
الشركاء:
الموارد:
التقييم:`;

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'عذراً، لم يتم إرسال الرسائل بشكل صحيح.' });
        }

        // Convert messages from [{role: "user" | "assistant", content: "..."}] 
        // to Gemini format [{role: "user" | "model", parts: [{text: "..."}]}]
        const formattedContents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: formattedContents,
            config: {
                systemInstruction: DALEEL_SYSTEM_PROMPT,
                temperature: 0.7,
            }
        });

        res.json({ reply: response.text });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'عذراً، حدث خطأ أثناء الاتصال مع خادم الذكاء الاصطناعي (Gemini).' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});