const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);
const { Strategy: LocalStrategy } = require('passport-local').Strategy;
const request = require('supertest');
const express = require('express');
const session = require('express-session');
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


// Middleware para usar o express-session
app.use(session({
    secret: 'seuSegredoSuperSecreto',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Inicializar o Passport
app.use(passport.initialize());
app.use(passport.session());

// Defina suas rotas e lógicas do Passport

passport.serializeUser(function (user, done) {
    done(null, user.id);  // Armazena o ID do usuário na sessão
});

passport.deserializeUser(async function (id, done) {
    try {
        const user = await User.findById(id); // Aguarda o resultado da busca
        done(null, user); // Chama done com o usuário encontrado
    } catch (err) {
        done(err); // Passa o erro para o Passport
    }
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, function (email, password, done) {
    // Verifique a autenticação do usuário aqui (exemplo com banco de dados)
    User.findOne({ email: email }, function (err, user) {
        if (err) return done(err);
        if (!user || !user.validPassword(password)) {
            return done(null, false, { message: 'Email ou senha incorretos' });
        }
        return done(null, user);
    });
}));

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',   // Redireciona para a página de dashboard após o login bem-sucedido
    failureRedirect: '/login',       // Redireciona para a página de login em caso de falha
    failureFlash: true               // Se você quiser exibir mensagens de erro
}));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { // Verifica se o usuário está autenticado
        return next();
    }
    res.redirect('/login'); // Redireciona para a página de login se não autenticado
}

app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.send(`Bem-vindo ao Dashboard, ${req.user.email}!`);
});


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


app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body); // Verifique os dados que estão sendo recebidos

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

// Mock para exemplo
const users = [
    { id: 1, email: 'user@example.com', password: '$2b$10$abcdef...' }, // Hash de senha
];


function generateToken(user) {
    const payload = {
        id: user.id, // ID único do usuário
        email: user.email, // Email ou outro dado relevante
    };

    // Assinando o token
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Expira em 1 hora
}


// Middleware para proteger rotas
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token não fornecido ou malformado' });
    }


    if (authHeader && authHeader.split(' ')[1]) {
        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decoded); // Mostra os dados decodificados
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado' });
            }
            return res.status(401).json({ message: 'Token inválido' });
        }

    } else {
        return res.status(401).json({ message: 'Acesso negado' });
    }
}


const token = jwt.sign(
    { userId: '12345', email: 'usuario@example.com' }, // Dados que você deseja armazenar no token
    process.env.JWT_SECRET,                            // Segredo
    { expiresIn: '1h' }                                // Tempo de expiração
);

console.log(token);


// Rota protegida para posts
app.get('/posts', authMiddleware, async (req, res) => {
    try {
        const { user } = req; // Usuário autenticado extraído do middleware
        req.user = { _id: 'mockUserId', role: 'professor' }; // Usuário fictício
        next();
        console.log('Usuário autenticado:', req.user);


        if (!user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        let posts;
        if (user.role === 'professor') {
            // Busca posts específicos do professor (autor = user._id)
            posts = await Post.find({ autor: user._id });
        } else {
            // Busca todos os posts para outros usuários
            posts = await Post.find();
        }

        if (!posts || posts.length === 0) {
            return res.status(404).json({ error: 'Nenhum post encontrado' });
        }

        res.status(200).json(posts);
    } catch (error) {
        console.error('Erro ao buscar posts:', error.message);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

app.get('/test', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});



const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;


app.get('/posts/:id', (req, res) => {
    const { id } = req.params;
    const post = posts.find(p => p.id === parseInt(id));
    if (!post) {
        return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.json(post);
});

const posts = [
    { id: 1, titulo: 'Primeiro Post', conteudo: 'Este é o conteúdo do primeiro post.', autor: 'Mariana' },
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

// app.post('/posts', authMiddleware, async (req, res) => {
//     // Lógica para criar um post
//     try {
//         const { title, content } = req.body;
//         if (!title || !content) {
//             return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
//         }

//         const post = new Post({ title, content, autor: req.user._id });
//         await post.save();
//         res.status(201).json(post);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Erro ao criar post' });
//     }
// });


app.post('/posts', (req, res) => {
    console.log('Requisição recebida:', req.body);
    res.send('Debugando...');
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

