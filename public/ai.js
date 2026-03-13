export async function getAIResponse(messagesArray, userId = null) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messagesArray,
                userId: userId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error("Error communicating with AI API", error);
        return "عذراً، يبدو أن الخادم لا يستجيب في الوقت الحالي. يرجى التأكد من تشغيل الخادم (Node.js) وتوفر مفتاح API صحيح.";
    }
}
