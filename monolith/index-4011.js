const localtunnel = require("localtunnel");
console.log("hey");

(async () => {
  console.log("localtunnel", localtunnel);
  try {
    const tunnel = await localtunnel(4011, { subdomain: "myhost" });
    console.log(tunnel);

    tunnel.on("close", () => {
      // tunnels are closed
      console.log("closing 4011");
    });
    // the assigned public url for your tunnel
    // i.e. https://abcdefgjhij.localtunnel.me
    console.log(tunnel.url);
  } catch (err) {
    console.log(err);
  }
})();
