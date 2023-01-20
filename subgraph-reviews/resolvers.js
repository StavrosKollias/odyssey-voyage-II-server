const { AuthenticationError, ForbiddenError } = require("./utils/errors");

const resolvers = {
  Query: {
    review: (_, { id }, { dataSources }) =>
      dataSources.reviewsAPI.getListing(id),
  },
  Mutation: {
    // this is for reviews
    submitGuestReview: async (
      _,
      { bookingId, guestReview },
      { dataSources, userId }
    ) => {
      if (!userId) throw AuthenticationError();

      const { rating, text } = guestReview;
      const guestId = await dataSources.bookingsAPI.getGuestIdForBooking(
        bookingId
      );

      const createdReview = await dataSources.reviewsAPI.createReviewForGuest({
        bookingId,
        guestId,
        authorId: userId,
        text,
        rating,
      });
      return {
        code: 200,
        success: true,
        message: "Successfully submitted review for guest",
        guestReview: createdReview,
      };
    },
    submitHostAndLocationReviews: async (
      _,
      { bookingId, hostReview, locationReview },
      { dataSources, userId }
    ) => {
      if (!userId) throw AuthenticationError();

      const listingId = await dataSources.bookingsAPI.getListingIdForBooking(
        bookingId
      );
      const createdLocationReview =
        await dataSources.reviewsAPI.createReviewForListing({
          bookingId,
          listingId,
          authorId: userId,
          text: locationReview.text,
          rating: locationReview.rating,
        });

      const { hostId } = await dataSources.listingsAPI.getListing(listingId);
      const createdHostReview =
        await dataSources.reviewsAPI.createReviewForHost({
          bookingId,
          hostId,
          authorId: userId,
          text: hostReview.text,
          rating: hostReview.rating,
        });

      return {
        code: 200,
        success: true,
        message: "Successfully submitted review for host and location",
        hostReview: createdHostReview,
        locationReview: createdLocationReview,
      };
    },
  },
  Listing: {
    // # TODO To be migrated to Listings with reviews subgraph migration
    overallRating: ({ id }, _, { dataSources }) => {
      console.log(id);
      return dataSources.reviewsAPI.getOverallRatingForListing(id);
    },
    // # TODO To be migrated to Listings with reviews subgraph migration
    reviews: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsAPI.getReviewsForListing(id);
    },
  },
  Booking: {
    // Guest Reviews resolver
    guestReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsAPI.getReviewForBooking("GUEST", id);
    },
    hostReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsAPI.getReviewForBooking("HOST", id);
    },
    locationReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsAPI.getReviewForBooking("LISTING", id);
    },
  },
  Host: {
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsAPI.getOverallRatingForHost(id);
    },
  },
  Review: {
    author: (review) => {
      let role = "";
      if (review.targetType === "LISTING" || review.targetType === "HOST") {
        role = "Guest";
      } else {
        role = "Host";
      }
      return { __typename: role, id: review.authorId };
    },
  },
};

module.exports = resolvers;
