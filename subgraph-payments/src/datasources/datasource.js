import { RESTDataSource } from "@apollo/datasource-rest";

export class PaymentsAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://rt-airlock-services-payments.herokuapp.com/";
  }

  getUserWalletAmount(userId) {
    return this.get(`wallet/${userId}`);
  }

  addFunds({ userId, amount }) {
    return this.patch(`wallet/${userId}/add`, { body: { amount } });
  }

  subtractFunds({ userId, amount }) {
    return this.patch(`wallet/${userId}/subtract`, { body: { amount } });
  }
}
