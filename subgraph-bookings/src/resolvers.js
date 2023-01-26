import { AuthenticationError, ForbiddenError } from "./utils/errors.js";

export const resolvers = {
  Query: {
    //TODO bookings
    guestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsAPI.getBookingsForUser(
          userId
        );
        return bookings;
      } else {
        throw ForbiddenError("Only guests have access to trips");
      }
    },
    upcomingGuestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsAPI.getBookingsForUser(
          userId,
          "UPCOMING"
        );

        return bookings;
      } else {
        throw ForbiddenError("Only guests have access to trips");
      }
    },
    pastGuestBookings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Guest") {
        const bookings = await dataSources.bookingsAPI.getBookingsForUser(
          userId,
          "COMPLETED"
        );
        return bookings;
      } else {
        throw ForbiddenError("Only guests have access to trips");
      }
    },
    bookingsForListing: async (
      _,
      { listingId, status },
      { dataSources, userId, userRole }
    ) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Host") {
        // need to check if listing belongs to host
        const listings = await dataSources.listingsAPI.getListingsForUser(
          userId
        );

        // const listings =
        if (listings.find((listing) => listing.id === listingId)) {
          const bookings =
            (await dataSources.bookingsAPI.getBookingsForListing(
              listingId,
              status
            )) || [];
          return bookings;
        } else {
          throw new Error("Listing does not belong to host");
        }
      } else {
        throw ForbiddenError("Only hosts have access to listing bookings");
      }
    },
  },
  Mutation: {
    // booking mutation
    createBooking: async (
      _,
      { createBookingInput },
      { dataSources, userId }
    ) => {
      if (!userId) throw AuthenticationError();

      const { listingId, checkInDate, checkOutDate } = createBookingInput;
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id: listingId,
        checkInDate,
        checkOutDate,
      });

      try {
        await dataSources.paymentsAPI.subtractFunds({
          userId,
          amount: totalCost,
        });
      } catch (e) {
        return {
          code: 400,
          success: false,
          message:
            "We couldn’t complete your request because your funds are insufficient.",
        };
      }

      try {
        const booking = await dataSources.bookingbookingsAPI.createBooking({
          listingId,
          checkInDate,
          checkOutDate,
          totalCost,
          guestId: userId,
        });

        return {
          code: 200,
          success: true,
          message: "Successfully booked!",
          booking,
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
  Booking: {
    // nice example of pulling the listing in here for each booking
    listing: ({ listingId }) => {
      return { id: listingId };
    },
    checkInDate: ({ checkInDate }, _, { dataSources }) => {
      return dataSources.bookingsAPI.getHumanReadableDate(checkInDate);
    },
    checkOutDate: ({ checkOutDate }, _, { dataSources }) => {
      return dataSources.bookingsAPI.getHumanReadableDate(checkOutDate);
    },
    guest: ({ guestId }) => {
      return { id: guestId };
    },
    totalPrice: async (
      { listingId, checkInDate, checkOutDate },
      _,
      { dataSources }
    ) => {
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id: listingId,
        checkInDate,
        checkOutDate,
      });
      return totalCost;
    },
  },
  Listing: {
    // this is for populating the data booking for the listing nice example
    bookings: async ({ id }, _, { dataSources }) => {
      return await dataSources.bookingsAPI.getBookingsForListing(id);
    },
  },
};
