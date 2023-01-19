const { AuthenticationError, ForbiddenError } = require("./utils/errors");

const resolvers = {
  Query: {
    // # TODO To be migrated to Listings with bookings subgraph migration
    searchListings: async (_, { criteria }, { dataSources }) => {
      console.log(criteria);
      const { numOfBeds, checkInDate, checkOutDate, page, limit, sortBy } =
        criteria;
      const listings = await dataSources.listingsAPI.getListings({
        numOfBeds,
        page,
        limit,
        sortBy,
      });

      // check availability for each listing
      const listingAvailability = await Promise.all(
        listings.map((listing) =>
          dataSources.bookingsDb.isListingAvailable({
            listingId: listing.id,
            checkInDate,
            checkOutDate,
          })
        )
      );

      // filter listings data based on availability
      const availableListings = listings.filter(
        (listing, index) => listingAvailability[index]
      );

      return availableListings;
    },
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
      const guestId = await dataSources.bookingsDb.getGuestIdForBooking(
        bookingId
      );

      const createdReview = await dataSources.reviewsDb.createReviewForGuest({
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

      const listingId = await dataSources.bookingsDb.getListingIdForBooking(
        bookingId
      );
      const createdLocationReview =
        await dataSources.reviewsDb.createReviewForListing({
          bookingId,
          listingId,
          authorId: userId,
          text: locationReview.text,
          rating: locationReview.rating,
        });

      const { hostId } = await dataSources.listingsAPI.getListing(listingId);
      const createdHostReview = await dataSources.reviewsDb.createReviewForHost(
        {
          bookingId,
          hostId,
          authorId: userId,
          text: hostReview.text,
          rating: hostReview.rating,
        }
      );

      return {
        code: 200,
        success: true,
        message: "Successfully submitted review for host and location",
        hostReview: createdHostReview,
        locationReview: createdLocationReview,
      };
    },
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
  Host: {
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getOverallRatingForHost(id);
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
  Listing: {
    // # TODO To be migrated to Listings with reviews subgraph migration
    overallRating: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getOverallRatingForListing(id);
    },
    // # TODO To be migrated to Listings with reviews subgraph migration
    reviews: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewsForListing(id);
    },
    // # TODO To be migrated to Listings with bookings subgraph migration
    currentlyBookedDates: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsDb.getCurrentlyBookedDateRangesForListing(id);
    },
    // # TODO To be migrated to Listings with bookings subgraph migration
    bookings: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsDb.getBookingsForListing(id);
    },
    // # TODO To be migrated to Listings with bookings subgraph migration
    numberOfUpcomingBookings: async ({ id }, _, { dataSources }) => {
      const bookings =
        (await dataSources.bookingsDb.getBookingsForListing(id, "UPCOMING")) ||
        [];
      return bookings.length;
    },
  },
  Booking: {
    // Guest Reviews resolver
    guestReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("GUEST", id);
    },
    hostReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("HOST", id);
    },
    locationReview: ({ id }, _, { dataSources }) => {
      return dataSources.reviewsDb.getReviewForBooking("LISTING", id);
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
