const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de MongoDB
mongoose.connect('mongodb://localhost:27017/chatgpt', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Modelo para las conversaciones
const ConversationSchema = new mongoose.Schema({
  messages: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

// Configuración de OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

// Ruta para el chat
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, conversationId, messages } = req.body;
    
    // Crear o actualizar la conversación
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        conversation = new Conversation({ messages: [] });
      }
    } else {
      conversation = new Conversation({ messages: [] });
    }
    
    // Agregar el mensaje del usuario
    conversation.messages.push({
      role: 'user',
      content: prompt
    });
    
    // Obtener respuesta de OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });
    
    const response = completion.data.choices[0].message.content;
    
    // Agregar la respuesta de la IA
    conversation.messages.push({
      role: 'assistant',
      content: response
    });
    
    // Guardar la conversación
    await conversation.save();
    
    res.json({
      response,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 