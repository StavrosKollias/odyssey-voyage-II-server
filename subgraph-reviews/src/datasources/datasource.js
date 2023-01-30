import { RESTDataSource } from "@apollo/datasource-rest";
import { v4 } from "uuid";
import { format } from "date-fns";
import Sequelize from "sequelize";
import Booking from "./services/bookings/sequelize/models/booking.js";
import Review from "./services/reviews/sequelize/models/review.js";

export class BookingsAPI {
  constructor() {
    const db = this.initializeSequelizeDb();
    this.db = db;
  }

  initializeSequelizeDb() {
    const config = {
      username: "root",
      password: null,
      database: "database_development",
      dialect: "sqlite",
      storage: "./../services/bookings/bookings.db", // path to the bookings database file, relative to where this datasource is initialized,
      logging: false, // set this to true if you want to see logging output in the terminal console
    };
    const sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );

    const db = {};
    db.Booking = Booking(sequelize, Sequelize.DataTypes);
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    return db;
  }

  // helper
  getHumanReadableDate(date) {
    return format(date, "MMM d, yyyy");
  }

  async getBooking(bookingId) {
    const booking = await this.db.Booking.findByPk(bookingId);
    return booking;
  }

  async getBookingsForUser(userId, status) {
    const filterOptions = { guestId: userId };
    if (status) {
      filterOptions.status = status;
    }
    const bookings = await this.db.Booking.findAll({
      where: { ...filterOptions },
    });
    return bookings.map((b) => b.dataValues);
  }

  async getBookingsForListing(listingId, status) {
    const filterOptions = { listingId };
    if (status) {
      filterOptions.status = status;
    }
    const bookings = await this.db.Booking.findAll({
      where: { ...filterOptions },
    });
    return bookings.map((b) => b.dataValues);
  }

  async getGuestIdForBooking(bookingId) {
    const { guestId } = await this.db.Booking.findOne({
      where: { id: bookingId },
      attributes: ["guestId"],
    });

    return guestId;
  }

  async getListingIdForBooking(bookingId) {
    const { listingId } = await this.db.Booking.findOne({
      where: { id: bookingId },
      attributes: ["listingId"],
    });

    return listingId;
  }

  // using the checkInDate and checkOutDate, return true if listing is available and false if not
  async isListingAvailable({ listingId, checkInDate, checkOutDate }) {
    const { between, or } = this.db.Sequelize.Op;

    const bookings = await this.db.Booking.findAll({
      where: {
        listingId: listingId,
        [or]: [
          { checkInDate: { [between]: [checkInDate, checkOutDate] } },
          { checkOutDate: { [between]: [checkInDate, checkOutDate] } },
        ],
      },
    });

    return bookings.length === 0;
  }

  // returns an array of dates that are booked for the listing (upcoming and current)
  async getCurrentlyBookedDateRangesForListing(listingId) {
    const { between, or } = this.db.Sequelize.Op;

    const bookings = await this.db.Booking.findAll({
      where: {
        listingId: listingId,
        [or]: [{ status: "UPCOMING" }, { status: "CURRENT" }],
      },
      attributes: ["checkInDate", "checkOutDate"],
    });

    const bookingsWithDates = bookings.map((b) => ({
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
    }));
    return bookingsWithDates;
  }

  async createBooking({
    listingId,
    checkInDate,
    checkOutDate,
    totalCost,
    guestId,
  }) {
    if (
      await this.isListingAvailable({ listingId, checkInDate, checkOutDate })
    ) {
      const booking = await this.db.Booking.create({
        id: v4.uuidv4(),
        listingId,
        checkInDate,
        checkOutDate,
        totalCost,
        guestId,
        status: "UPCOMING",
      });

      return {
        id: booking.id,
        checkInDate: this.getHumanReadableDate(booking.checkInDate),
        checkOutDate: this.getHumanReadableDate(booking.checkOutDate),
      };
    } else {
      throw new Error(
        "We couldn't complete your request because the listing is unavailable for the given dates."
      );
    }
  }
}

export class ListingsAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://test.loca.lt";
  }

  getListingsForUser(userId) {
    return this.get(`user/${userId}/listings`);
  }

  getListings({ numOfBeds, page, limit, sortBy }) {
    return this.get(
      `listings?numOfBeds=${numOfBeds}&page=${page}&limit=${limit}&sortBy=${sortBy}`
    );
  }

  getFeaturedListings(limit = 1) {
    return this.get(`featured-listings?limit=${limit}`);
  }

  getListing(listingId) {
    return this.get(`listings/${listingId}`);
  }

  getAllAmenities() {
    return this.get(`listing/amenities`);
  }

  getTotalCost({ id, checkInDate, checkOutDate }) {
    return this.get(
      `listings/${id}/totalCost?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
    );
  }

  createListing(listing) {
    return this.post(`listings`, { body: { listing } });
  }

  updateListing({ listingId, listing }) {
    return this.patch(`listings/${listingId}`, { body: { listing } });
  }
}

export class ReviewsAPI {
  constructor() {
    const db = this.initializeSequelizeDb();
    this.db = db;
  }

  initializeSequelizeDb() {
    const config = {
      username: "root",
      password: null,
      database: "database_development",
      dialect: "sqlite",
      storage: "./../services/reviews/reviews.db", // path to the reviews database file, relative to where this datasource is initialized
      logging: false, // set this to true if you want to see logging output in the terminal console
    };
    const sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );

    const db = {};
    db.Review = Review(sequelize, Sequelize.DataTypes);
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    return db;
  }

  async getReviewsByUser(userId) {
    return this.db.Review.findAll({ where: { authorId: userId } });
  }

  async getOverallRatingForListing(listingId) {
    const overallRating = await this.db.Review.findOne({
      where: { targetType: "LISTING", targetId: listingId },
      attributes: [
        [
          this.db.sequelize.fn("AVG", this.db.sequelize.col("rating")),
          "avg_rating",
        ],
      ],
    });

    return overallRating.getDataValue("avg_rating");
  }

  async getOverallRatingForHost(hostId) {
    const overallRating = await this.db.Review.findOne({
      where: { targetType: "HOST", targetId: hostId },
      attributes: [
        [
          this.db.sequelize.fn("AVG", this.db.sequelize.col("rating")),
          "avg_rating",
        ],
      ],
    });

    return overallRating.getDataValue("avg_rating");
  }

  async getReviewsForListing(listingId) {
    const reviews = await this.db.Review.findAll({
      where: { targetType: "LISTING", targetId: listingId },
    });
    return reviews;
  }

  async getReviewForBooking(targetType, bookingId) {
    // booking review submitted by guest about a host or a listing
    const review = await this.db.Review.findOne({
      where: { targetType, bookingId },
    });
    return review;
  }

  async createReviewForGuest({ bookingId, guestId, authorId, text, rating }) {
    const review = await this.db.Review.create({
      id: v4.uuidv4(),
      bookingId,
      targetId: guestId,
      targetType: "GUEST",
      authorId,
      rating,
      text,
    });

    return review;
  }

  async createReviewForHost({ bookingId, hostId, authorId, text, rating }) {
    const review = await this.db.Review.create({
      id: uuidv4(),
      bookingId,
      targetId: hostId,
      targetType: "HOST",
      authorId,
      text,
      rating,
    });

    return review;
  }

  async createReviewForListing({
    bookingId,
    listingId,
    authorId,
    text,
    rating,
  }) {
    const review = await this.db.Review.create({
      id: uuidv4(),
      bookingId,
      targetId: listingId,
      targetType: "LISTING",
      authorId,
      text,
      rating,
    });

    return review;
  }
}
