interface User {
  name: string;
  email: string;
}

export default interface UsersDefinition {
  superuser: User;
  user1: User;
}