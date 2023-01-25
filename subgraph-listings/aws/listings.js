import { ApolloServer } from "@apollo/server";
import { startServerAndCreateLambdaHandler } from "@as-integrations/aws-lambda"; //highlight-line
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { readFileSync } from "fs";
import axios from "axios";

import resolvers from "./resolvers.js";
import ListingsAPI from "./datasources/listings.js";
import BookingsAPI from "./datasources/bookings.js";

import { AuthenticationError } from "./utils/errors.js";

const typeDefs = gql(readFileSync("./schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});

// This final export is important!
export const graphqlHandler = startServerAndCreateLambdaHandler(server, {
  context: async ({ event }) => {
    // console.log(req);
    const token = event.headers.authorization || "";
    const userId = token.split(" ")[1]; // get the user name after 'Bearer '

    let userInfo = {};
    if (userId) {
      const { data } = await axios
        .get(`http://localhost:4011/login/${userId}`)
        .catch((error) => {
          throw AuthenticationError();
        });

      userInfo = { userId: data.id, userRole: data.role };
    }

    return {
      ...userInfo,
      dataSources: {
        listingsAPI: new ListingsAPI(),
        bookingsAPI: new BookingsAPI(),
      },
    };
  },
}); //highlight-line
