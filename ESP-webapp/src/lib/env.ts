type ENV_type = {
  API_HOST: string;
  API_PORT: number;
  API_PATH: string;
};

const ENV = {
  API_HOST: "http://192.168.137.194",
  API_PORT: 80,
  API_PATH: "api/",
};

// USE remote host (for development)
const getAPIuri = (ENV: ENV_type) =>
  `${ENV.API_HOST}/${ENV.API_PATH}`;

// USE current host (uploaded on ESP)
// const getAPIuri = (ENV: ENV_type) =>
//   `${ENV.API_PATH}`;

export { ENV, getAPIuri };
