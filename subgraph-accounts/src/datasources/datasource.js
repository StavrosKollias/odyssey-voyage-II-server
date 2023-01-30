import { RESTDataSource } from "@apollo/datasource-rest";

export class AccountsAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://myhost.loca.lt";
  }

  login(username) {
    return this.get(`login/${username}`);
  }

  updateUser({ userId, userInfo }) {
    return this.patch(`user/${userId}`, { body: { ...userInfo } });
  }

  getUser(userId) {
    return this.get(`user/${userId}`);
  }
}
