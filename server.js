const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Para criptografar a senha
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

// Criptografar a senha antes de salvar no banco
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    // Criptografa a senha com um salt (sal)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar a senha fornecida com a armazenada no banco
userSchema.methods.matchPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};
const User = mongoose.model('User', userSchema);
const { Strategy: LocalStrategy } = require('passport-local').Strategy;
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
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

// Rota de login de usuário
app.post('/login', async (req, res) => {

    const { email, password } = req.body;

    try {
        // Verifica se o usuário existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Compara a senha fornecida com a armazenada no banco
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { _id: user._id, role: user.role }, // Payload
            secretKey, // Chave secreta
            { expiresIn: '1h' } // Expiração do token
        );

        // Retorna o token para o cliente
        res.status(200).json({ token });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});


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


app.use(express.json()); // Para permitir que o corpo da requisição seja em JSON

const secretKey = 'suaChaveSecreta'; // Chave secreta para JWT

// Rota de cadastro de usuário
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Verifica se o e-mail já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'E-mail já registrado' });
        }

        // Cria o novo usuário
        const newUser = new User({ name, email, password, role });
        await newUser.save();

        res.status(201).json({
            message: 'Usuário registrado com sucesso',
            user: { name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
});


function generateToken(user) {
    const payload = {
        id: user.id, // ID único do usuário
        email: user.email, // Email ou outro dado relevante
    };

    // Assinando o token
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Expira em 1 hora
}


// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        // Verifica o token
        const decoded = jwt.verify(token, 'suaChaveSecreta');
        const user = await User.findById(decoded._id);

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        // Adiciona o usuário ao req.user
        req.user = user;
        next();
    } catch (error) {
        console.error('Erro ao verificar o token:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
};


// Rota protegida para posts
app.get('/posts', authMiddleware, async (req, res) => {
    try {
        const { user } = req; // Usuário autenticado extraído do middleware
        console.log('Usuário autenticado:', user);

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


const postSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    conteudo: { type: String, required: true },
    autor: { type: String, required: true}
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;

  
app.get('/posts/:id', (req, res) => {
    const { id } = req.params;
  
    // Mock completo
    const posts = [
      { id: 1, titulo: "Introdução ao Node.js", conteudo: "Texto sobre Node.js", autor: "João Silva" },
      { id: 2, titulo: "Aprendendo MongoDB", conteudo: "Texto sobre MongoDB", autor: "Maria Souza" },
    ];
  
    // Busca o post pelo ID (convertendo id para número)
    const post = posts.find(p => p.id === parseInt(id));
  
    if (!post) {
      return res.status(404).json({ error: "Post não encontrado" });
    }
  
    res.json(post);
  });
  
const posts = [
     { id: 1, titulo: "Introdução ao Node.js", conteudo: "Texto sobre Node.js", autor: "João Silva" },
     { id: 2, titulo: "Aprendendo MongoDB", conteudo: "Texto sobre MongoDB", autor: "Maria Souza" },
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
module.exports = User;


