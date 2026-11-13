import type { JSX } from "react";
import { doSocialLogin } from "@/app/actions";

const SocialLogins = (): JSX.Element => {
  return (
    <form action={doSocialLogin}>
      <button
        className="bg-blue-500 text-white p-1 rounded-md m-1 text-lg"
        type="submit"
        name="action"
        value="google"
      >
        Sign In With Google
      </button>
      {/* GitHub sign-in removed */}
    </form>
  );
};

export default SocialLogins;
