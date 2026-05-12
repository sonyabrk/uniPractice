import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

// схема 
const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    books: [Book!]!
  }

  type Book {
    id: ID!
    title: String!
    authorId: ID!
    author: Author!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
  }

  type Mutation {
    createAuthor(name: String!): Author!
    createBook(title: String!, authorId: ID!): Book!
  }
`;

// хранение данных в памяти
const authors = [];
const books = [];

// резолверы
const resolvers = {
  Query: {
    books: () => books,
    book: (_, { id }) => books.find(b => b.id === id),
    authors: () => authors,
  },
  Mutation: {
    createAuthor: (_, { name }) => {
      const author = { id: String(authors.length + 1), name };
      authors.push(author);
      return author;
    },
    createBook: (_, { title, authorId }) => {
      // проверка существования автора 
      const authorExists = authors.some(a => a.id === authorId);
      if (!authorExists) {
        throw new Error(`Author with id ${authorId} not found`);
      }
      const book = { id: String(books.length + 1), title, authorId };
      books.push(book);
      return book;
    },
  },
  // вложенные резолверы для связи типов
  Author: {
    books: (parent) => books.filter(b => b.authorId === parent.id),
  },
  Book: {
    author: (parent) => authors.find(a => a.id === parent.authorId),
  },
};

// запуск сервера
const server = new ApolloServer({ typeDefs, resolvers });
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(` GraphQL Server ready at: ${url}`);