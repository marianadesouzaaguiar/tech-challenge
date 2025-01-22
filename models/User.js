const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true, // Garantir que o e-mail seja único
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['professor', 'aluno'], // Enum para limitar os valores de role
        default: 'aluno',
    },
});

module.exports = mongoose.model('User', userSchema);