import { create } from "zustand";

type AuthModalsState = {
    signInOpen: boolean;
    signUpOpen: boolean;
    forgotPasswordOpen: boolean;
    verifyEmail: string | null;
    openSignIn: () => void;
    openSignUp: () => void;
    openForgotPassword: () => void;
    openVerify: (email: string) => void;
    closeAll: () => void;
};

export const useAuthModals = create<AuthModalsState>((set) => ({
    signInOpen: false,
    signUpOpen: false,
    forgotPasswordOpen: false,
    verifyEmail: null,

    openSignIn: () =>
        set({
            signInOpen: true,
            signUpOpen: false,
            forgotPasswordOpen: false,
            verifyEmail: null,
        }),

    openSignUp: () =>
        set({
            signInOpen: false,
            signUpOpen: true,
            forgotPasswordOpen: false,
            verifyEmail: null,
        }),

    openForgotPassword: () =>
        set({
            signInOpen: false,
            signUpOpen: false,
            forgotPasswordOpen: true,
            verifyEmail: null,
        }),

    openVerify: (email) =>
        set({
            signInOpen: false,
            signUpOpen: true,
            forgotPasswordOpen: false,
            verifyEmail: email,
        }),

    closeAll: () =>
        set({
            signInOpen: false,
            signUpOpen: false,
            forgotPasswordOpen: false,
            verifyEmail: null,
        }),
}));