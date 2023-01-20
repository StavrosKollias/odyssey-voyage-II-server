const { AuthenticationError, ForbiddenError } = require("./utils/errors");

const resolvers = {
  Query: {
    example: () => "Hello World!",
  },
};

module.exports = resolvers;
