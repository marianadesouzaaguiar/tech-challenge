// module.exports = {
//     setupFiles: ['dotenv/config'],
//   };
  
  module.exports = {
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};

  console.log('MONGO_URI:', process.env.MONGO_URI);
