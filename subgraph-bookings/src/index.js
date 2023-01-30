import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import serverlessExpress from "@vendia/serverless-express";
// import { startServerAndCreateLambdaHandler } from "@as-integrations/aws-lambda"; // for not consumized http
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import cors from "cors";
import { readFileSync } from "fs";
import axios from "axios";
import { resolvers } from "./resolvers.js";
import { BookingsAPI, ListingsAPI } from "./datasources/datasource.js";

const typeDefs = gql(readFileSync("./schema.graphql", { encoding: "utf-8" }));

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs,
    resolvers,
  }),
});
server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();
const app = express();
app.use(
  cors({
    origin: "*",
    // [
    //    `${Domain}${APOLLOGATEWAY_PORT}`,
    //   "https://studio.apollographql.com",
    // ],
    // credentials: true,
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      // Here is where you'll have access to the
      // API Gateway event and Lambda Context
      const { event, context } = serverlessExpress.getCurrentInvoke();

      //   console.log(event);
      const token = event.headers.authorization || "";
      const userId = token.split(" ")[1]; // get the user name after 'Bearer '
      console.log(token);
      let userInfo = {};
      if (userId) {
        const { data } = await axios
          .get(`https://myhost.loca.lt/login/${userId}`)
          .catch((error) => {
            throw AuthenticationError();
          });

        userInfo = { userId: data.id, userRole: data.role };
      }
      console.log("hey");
      // console.log({
      //   expressRequest: req,
      //   expressResponse: res,
      //   lambdaEvent: event,
      //   lambdaContext: context,
      // });

      return {
        ...userInfo,
        dataSources: {
          bookingsAPI: new BookingsAPI(),
          listingsAPI: new ListingsAPI(),
        },
      };
    },
  })
);

// This final export is important!
export const graphqlHandler = serverlessExpress({ app });
