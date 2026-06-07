export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
}

export interface User {
  username: string;
  token: string;
  serverUrl: string;
}
