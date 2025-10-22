const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o banco de dados MySQL
let connection;
connection = mysql.createConnection(config.db);

connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados MySQL: ', err);
        process.exit(1);
    }
});


// Tela de Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Autenticar login
app.post('/login', async (req, res) => {
    let usuario = req.body.usuario;
      let senha = req.body.senha;
      let sessionToken = crypto.randomBytes(64).toString('hex');
      
      // Executar query com promise
      const [results] = await connection.promise().query(
        'SELECT * FROM usuarios WHERE nome_usuario = ?', 
        [usuario]
      );
      
      // Usuário não encontrado
      if (results.length === 0) {
        return res.json({ 
          success: false, 
          message: 'Usuário não encontrado' 
        });
      }
  
      const user = results[0];
      
      // Comparar senhas
      const senhaConfere = await bcrypt.compare(senha, user.senha);
      
      if (!senhaConfere) {
        return res.json({ 
          success: false, 
          message: 'Senha incorreta' 
        });
      }
  
      // retorna dados pro cliente
      res.json({ 
        success: true,
        nome: user.nome_completo,
        usuario: user.nome_usuario,
        sessionToken: sessionToken
      });
  });
  
  // pagina produtos
  app.get('/produtos', (req, res) => {
      // Enviar arquivo HTML
      res.sendFile(path.join(__dirname, '../frontend/produtos.html'));
  });
  
  // busca produtos
  app.get('/produtos/lista', (req, res) => {
      // busca dados da tabela de estoque  
      // com join na tabela de produtos 
      // buscando nome, marca, preco, cor, peso e id
      connection.query(
          `SELECT p.nome, p.marca, p.preco, p.cor, p.peso, p.id, e.quantidade 
          FROM produtos p
          JOIN estoque e ON p.id = e.produto_id`,
              (err, results) => {
                  if (err) {
                      console.error('Erro ao buscar produtos:', err);
                      return res.status(500).send('Erro ao buscar produtos');
                  }
  
                  res.json(results);
              }
      );		
  });
  
  app.put('/produtos/atualizar/:id', (req, res) => {
      const productId = req.params.id;
      const change = parseInt(req.body.change, 10);	
      const sessionToken = req.body.sessionToken;
      const usuario = req.body.usuario;
  
  
      console.log(usuario);
  
      // atualizar quantidade 
      connection.query(`UPDATE estoque SET quantidade = quantidade + ? WHERE produto_id = ?`,
          [change, productId], (err, results) => {
          if (err) {
              console.error('Erro ao atualizar quantidade:', err);
              return res.status(500).send('Erro ao atualizar quantidade');
          }	
  
          // registrar alteração no log
          connection.query('INSERT into log_estoque (produto_id, alteracao, usuario, token, data_hora) VALUES (?, ?, ?, ?, NOW())',
              [productId, change, usuario, sessionToken], (err, results) => {
              if (err) {
                  console.error('Erro ao inserir log de estoque:', err);
                  return res.status(500).send('Erro ao inserir log de estoque');
              }
          });
  
          res.json({ success: true });
      });
  });
  
  // Iniciar servidor
  app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
  });