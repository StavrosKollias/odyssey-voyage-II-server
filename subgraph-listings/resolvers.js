const { AuthenticationError, ForbiddenError } = require("./utils/errors");

const resolvers = {
  // TODO: fill in resolvers
  Query: {
    listing: (_, { id }, { dataSources }) => {
      return dataSources.listingsAPI.getListing(id);
    },

    hostListings: async (_, __, { dataSources, userId, userRole }) => {
      if (!userId) throw AuthenticationError();

      if (userRole === "Host") {
        // const data = await dataSources.listingsAPI.getListingsForUser(userId);
        // // console.log(data);
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
  },
  Amenities: {
    __resolveReference: async (listing, { dataSources }) => {
      console.log(listing);
      const data = await dataSources.listingsAPI.getListing(listing.id);
      return data.amenities;
    },
  },
  AmenityCategory: {
    ACCOMMODATION_DETAILS: "Accommodation Details",
    SPACE_SURVIVAL: "Space Survival",
    OUTDOORS: "Outdoors",
  },
};

module.exports = resolvers;
