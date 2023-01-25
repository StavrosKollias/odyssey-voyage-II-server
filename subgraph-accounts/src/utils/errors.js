import { GraphQLError } from "graphql";

export const AuthenticationError = () => {
  const authErrMessage = "*** you must be logged in ***";
  return new GraphQLError(authErrMessage, {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
};

export const ForbiddenError = (errMessage) => {
  return new GraphQLError(errMessage, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
};

