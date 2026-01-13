import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App';

const router = createBrowserRouter(
    [
        {
            path: '/',
            element: (
                <Provider store={store}>
                    <App />
                </Provider>
            ),
        },
    ],
    {
        future: {
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true,
            v7_normalizeFormMethod: true,
            v7_partialHydration: true,
            v7_skipActionErrorRevalidation: true,
        },
    }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider
            router={router}
            future={{
                v7_startTransition: true,
            }}
        />
    </React.StrictMode>
);
