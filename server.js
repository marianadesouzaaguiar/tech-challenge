const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);
//const User = require('./models/User');
const { Strategy: LocalStrategy } = require('passport-local');
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(require('cors')());


// Conexão ao MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB conectado'))
    .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    serverSelectionTimeoutMS: 15000// Increase timeout to 15 seconds
})

// Rotas básicas
app.get('/', (req, res) => res.send('API está funcionando!'));

// app.get('/posts', (req, res) => {
//     res.json(posts);
// });



// Configuração do Passport
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return done(null, false, { message: 'Usuário não encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Senha incorreta' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Rota de login
app.post('/login', passport.authenticate('local'), (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
  
    // Validação dos dados
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
  
    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // Criar um novo usuário
    const newUser = new User({ email, password: hashedPassword });
    try {
      await newUser.save();
      res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
  });
// Middleware para proteger rotas
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Acesso negado' });
    }

    if (authHeader && authHeader.split(' ')[1]) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Token inválido' });
        }
    } else {
        return res.status(401).json({ message: 'Acesso negado' });
    }
}

// Rota protegida para posts
app.get('/posts', authMiddleware, async (req, res) => {
    try {
        const { user } = req;

        if (user.role === 'professor') {
            const posts = await Post.find({ autor: user._id });
            res.json(posts);
        } else {
            const posts = await Post.find();
            res.json(posts);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

app.get('/posts/:id', (req, res) => {
    const { id } = req.params;
    const post = posts.find(p => p.id === parseInt(id));
    if (!post) {
        return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.json(post);
});

const posts = [
    { id: 1, titulo: 'Primeiro Post', conteudo: 'Este é o conteúdo do primeiro post.' },
    { id: 2, titulo: 'Segundo Post', conteudo: 'Conteúdo relacionado ao segundo post.' },
    { id: 3, titulo: 'Tutorial Node.js', conteudo: 'Aprenda Node.js neste tutorial completo.' },
    { id: 4, titulo: 'Node.js Avançado', conteudo: 'Técnicas avançadas de Node.js.' }
];
let nextId = 1;


app.post('/posts', (req, res) => {
    console.log('Recebido POST em /posts:', req.body); // Dentro da função de rota, o req está disponível
    const { titulo, conteudo, autor } = req.body;

    if (!titulo || !conteudo || !autor) {
        return res.status(400).json({ error: 'Campos obrigatórios: título, conteúdo e autor' });
    }

    const novoPost = { id: nextId++, titulo, conteudo, autor };
    posts.push(novoPost);
    res.status(201).json(novoPost);
});



app.put('/posts/:id', (req, res) => {
    const { id } = req.params;
    const { titulo, conteudo, autor } = req.body;
    const post = posts.find(p => p.id === parseInt(id));

    if (!post) {
        return res.status(404).json({ error: 'Post não encontrado' });
    }

    if (titulo) post.titulo = titulo;
    if (conteudo) post.conteudo = conteudo;
    if (autor) post.autor = autor;

    res.json(post);
});

app.delete('/posts/:id', (req, res) => {
    const { id } = req.params;
    const index = posts.findIndex(p => p.id === parseInt(id));

    if (index === -1) {
        return res.status(404).json({ error: 'Post não encontrado' });
    }

    posts.splice(index, 1);
    res.status(204).send();
});

app.get('/posts/search', (req, res) => {
    const { titulo, conteudo } = req.query;

    console.log('Parâmetros recebidos:', { titulo, conteudo });

    if (!titulo && !conteudo) {
        return res.status(400).json({ error: 'É necessário fornecer pelo menos um parâmetro de busca (titulo ou conteudo)' });
    }

    const postsEncontrados = posts.filter(post => {
        let tituloMatch = true;
        let conteudoMatch = true;

        if (titulo) {
            const termoTitulo = titulo.toLowerCase();
            tituloMatch = post.titulo.toLowerCase().includes(termoTitulo);
        }

        if (conteudo) {
            const termoConteudo = conteudo.toLowerCase();
            conteudoMatch = post.conteudo.toLowerCase().includes(termoConteudo);
        }

        return tituloMatch || conteudoMatch;
    });

    console.log('Posts encontrados:', postsEncontrados);

    if (postsEncontrados.length === 0) {
        return res.status(404).json({ error: 'Nenhum post encontrado com os critérios fornecidos' });
    }

    res.json(postsEncontrados);
});



// Exporte o app
if (require.main === module) {
    app.listen(PORT, () => console.log(`Servidor rodando na PORT ${PORT}`));
}

// Exporte a instância do app
module.exports = app;

