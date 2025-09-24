// import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      {/* <PageMeta
        title="La Cajita TV - Iniciar Sesión"
        description="Iniciar sesión en La Cajita TV - Panel de Administración"
      /> */}
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
