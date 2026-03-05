import type { JSX } from "react";
import { doLogout } from "@/app/actions";

const Logout = (): JSX.Element => {
  return (
    <form action={doLogout}>
      <button className="text-white" type="submit">Logout</button>
    </form>
  );
};

export default Logout;
