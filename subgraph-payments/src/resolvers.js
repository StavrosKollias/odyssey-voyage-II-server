import { AuthenticationError, ForbiddenError } from "./utils/errors.js";

export const resolvers = {
  // TODO: fill in resolvers
  Query: {
    payment: () => 100050504,
  },
  Mutation: {
    // mutation for Wallet
    addFundsToWallet: async (_, { amount }, { dataSources, userId }) => {
      if (!userId) throw AuthenticationError();
      try {
        const updatedWallet = await dataSources.paymentsAPI.addFunds({
          userId,
          amount,
        });
        return {
          code: 200,
          success: true,
          message: "Successfully added funds to wallet",
          amount: updatedWallet.amount,
        };
      } catch (err) {
        return {
          code: 400,
          success: false,
          message: err.message,
        };
      }
    },
  },
  Guest: {
    funds: async (_, __, { dataSources, userId }) => {
      const { amount } = await dataSources.paymentsAPI.getUserWalletAmount(
        userId
      );
      return amount;
    },
  },
};
