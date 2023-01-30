const localtunnel = require("localtunnel");

(async () => {
  console.log("localtunnel", localtunnel);
  try {
    const tunnel = await localtunnel(4010, { subdomain: "test" });
    console.log("opening 4010");
    // console.log(tunnel);

    tunnel.on("close", () => {
      // tunnels are closed
      console.log("closing 4010");
    });
    // the assigned public url for your tunnel
    // i.e. https://abcdefgjhij.localtunnel.me
    console.log(tunnel.url);
  } catch (err) {
    console.log(err);
  }
})();
