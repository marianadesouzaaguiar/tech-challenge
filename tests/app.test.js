const request = require('supertest');
const app = require('../server');


describe('Testes de Rotas de Postagens', () => {
    it('Deve retornar mensagem de boas-vindas', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('API está funcionando!');
    });

    it('Deve criar um novo post', async () => {
        const res = await request(app)
            .post('/posts')
            .send({ titulo: 'Título Teste', conteudo: 'Conteúdo Teste', autor: 'Autor Teste' });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
    });

    it('Deve listar todos os posts', async () => {
        const res = await request(app).get('/posts');
        expect(res.statusCode).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
    });

    it('Deve retornar erro ao buscar um post inexistente', async () => {
        const res = await request(app).get('/posts/999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('Deve excluir um post existente', async () => {
        const post = await request(app)
            .post('/posts')
            .send({ titulo: 'Para excluir', conteudo: 'Teste', autor: 'Autor' });

        const res = await request(app).delete(`/posts/${post.body.id}`);
        expect(res.statusCode).toBe(204);
    });

    it('Deve editar uma postagem existente', async () => {
        const post = await request(app)
            .post('/posts')
            .send({
                titulo: 'Post para editar',
                conteudo: 'Conteúdo original',
                autor: 'Autor Teste'
            });

        const updatedPost = await request(app)
            .put(`/posts/${post.body.id}`)
            .send({
                titulo: 'Post editado',
                conteudo: 'Conteúdo atualizado',
                autor: 'Autor Teste'
            });

        expect(updatedPost.statusCode).toBe(200);
        expect(updatedPost.body.titulo).toBe('Post editado');
        expect(updatedPost.body.conteudo).toBe('Conteúdo atualizado');
    });

    it('Deve retornar erro 400 se nenhum parâmetro de busca for fornecido', async () => {
        const response = await request(app).get('/posts/search');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: 'É necessário fornecer pelo menos um parâmetro de busca (titulo ou conteudo)',
        });
    });

    it('Deve retornar posts que correspondem ao título fornecido', async () => {
        const response = await request(app).get('/posts/search?titulo=Tutorial');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 3, titulo: 'Tutorial Node.js', conteudo: 'Aprenda Node.js neste tutorial completo.' },
        ]);
    });

    it('Deve retornar posts que correspondem ao conteúdo fornecido', async () => {
        const response = await request(app).get('/posts/search?conteudo=node');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 3, titulo: 'Tutorial Node.js', conteudo: 'Aprenda Node.js neste tutorial completo.' },
            { id: 4, titulo: 'Node.js Avançado', conteudo: 'Técnicas avançadas de Node.js.' },
        ]);
    });

    it('Deve retornar posts que correspondem tanto ao título quanto ao conteúdo', async () => {
        const response = await request(app).get('/posts/search?titulo=Node&conteudo=Avançado');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 4, titulo: 'Node.js Avançado', conteudo: 'Técnicas avançadas de Node.js.' },
        ]);
    });

    it('Deve retornar erro 404 se nenhum post corresponder aos critérios', async () => {
        const response = await request(app).get('/posts/search?titulo=Inexistente');
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: 'Nenhum post encontrado com os critérios fornecidos',
        });
    });

    it('Deve ser case-insensitive (não deve diferenciar maiúsculas e minúsculas)', async () => {
        const response = await request(app).get('/posts/search?titulo=tutorial');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 3, titulo: 'Tutorial Node.js', conteudo: 'Aprenda Node.js neste tutorial completo.' },
        ]);
    });

    it('Deve retornar múltiplos posts se mais de um corresponder ao termo no título ou conteúdo', async () => {
        const response = await request(app).get('/posts/search?conteudo=post');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 1, titulo: 'Primeiro Post', conteudo: 'Este é o conteúdo do primeiro post.' },
            { id: 2, titulo: 'Segundo Post', conteudo: 'Conteúdo relacionado ao segundo post.' },
        ]);
    });

    it('Deve retornar posts mesmo com busca parcial no título ou conteúdo', async () => {
        const response = await request(app).get('/posts/search?titulo=tut');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { id: 3, titulo: 'Tutorial Node.js', conteudo: 'Aprenda Node.js neste tutorial completo.' },
        ]);
    });
});