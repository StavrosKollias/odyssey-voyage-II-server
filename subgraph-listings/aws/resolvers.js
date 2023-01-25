import { AuthenticationError, ForbiddenError } from "./utils/errors.js";

const resolvers = {
  // TODO: fill in resolvers
  Query: {
    listing: (_, { id }, { dataSources }) => {
      return dataSources.listingsAPI.getListing(id);
    },

    hostListings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Host") {
        return dataSources.listingsAPI.getListingsForUser(userId);
      } else {
        throw ForbiddenError("Only hosts have access to listings.");
      }
    },
    featuredListings: async (_, __, { dataSources }) => {
      const limit = 3;
      const data = await dataSources.listingsAPI.getFeaturedListings(limit);
      return data;
    },
    listingAmenities: (_, __, { dataSources }) => {
      return dataSources.listingsAPI.getAllAmenities();
    },

    searchListings: async (_, { criteria }, { dataSources }) => {
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
          dataSources.bookingsAPI.isListingAvailable({
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
    // Listings Mutation
    createListing: async (
      _,
      { listing },
      { dataSources, userId, userRole }
    ) => {
      if (!userId) throw AuthenticationError();
      const {
        title,
        description,
        photoThumbnail,
        numOfBeds,
        costPerNight,
        locationType,
        amenities,
      } = listing;

      if (userRole === "Host") {
        try {
          const newListing = await dataSources.listingsAPI.createListing({
            title,
            description,
            photoThumbnail,
            numOfBeds,
            costPerNight,
            hostId: userId,
            locationType,
            amenities,
          });

          return {
            code: 200,
            success: true,
            message: "Listing successfully created!",
            listing: newListing,
          };
        } catch (err) {
          console.log(err);
          return {
            code: 400,
            success: false,
            message: err.message,
          };
        }
      } else {
        return {
          code: 400,
          success: false,
          message: "Only hosts can create new listings",
        };
      }
    },
    updateListing: async (
      _,
      { listingId, listing },
      { dataSources, userId }
    ) => {
      if (!userId) throw AuthenticationError();
      try {
        const updatedListing = await dataSources.listingsAPI.updateListing({
          listingId,
          listing,
        });

        return {
          code: 200,
          success: true,
          message: "Listing successfully updated!",
          listing: updatedListing,
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
  Listing: {
    // nice example of sending the listing to each booking booking
    __resolveReference: ({ id }, { dataSources }) => {
      return dataSources.listingsAPI.getListing(id);
    },
    host: ({ hostId }) => {
      return { id: hostId };
    },
    totalCost: async (
      { id },
      { checkInDate, checkOutDate },
      { dataSources }
    ) => {
      const { totalCost } = await dataSources.listingsAPI.getTotalCost({
        id,
        checkInDate,
        checkOutDate,
      });
      return totalCost;
    },
    amenities: async ({ id }, _, { dataSources }) => {
      const data = await dataSources.listingsAPI.getListing(id);
      return data.amenities;
    },
    currentlyBookedDates: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsAPI.getCurrentlyBookedDateRangesForListing(id);
    },
    bookings: ({ id }, _, { dataSources }) => {
      return dataSources.bookingsAPI.getBookingsForListing(id);
    },
    numberOfUpcomingBookings: async ({ id }, _, { dataSources }) => {
      const bookings =
        (await dataSources.bookingsAPI.getBookingsForListing(id, "UPCOMING")) ||
        [];
      return bookings.length;
    },
    coordinates: ({ id }, _, { dataSources }) => {
      return dataSources.listingsAPI.getListingCoordinates(id);
    },
  },
  AmenityCategory: {
    ACCOMMODATION_DETAILS: "Accommodation Details",
    SPACE_SURVIVAL: "Space Survival",
    OUTDOORS: "Outdoors",
  },
};

// module.exports = resolvers;
export default resolvers;
