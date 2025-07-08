import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';


import { SplashScreen } from 'src/components/loading-screen';

export const mainRoutes = [
  {
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    // children: [
    //   {
    //     element: (
    //       <MainLayout>
    //         <Outlet />
    //       </MainLayout>
    //     ),
    //     children: [
    //       {
    //         path: 'about-us',
    //         element: <AboutPage />,
    //       },
    //       {
    //         path: 'contact-us',
    //         element: <ContactPage />,
    //       },
    //       {
    //         path: 'faqs',
    //         element: <FaqsPage />,
    //       },
    //       {
    //         path: 'blank',
    //         element: <BlankPage />,
    //       },
    //       {
    //         path: 'product',
    //         children: [
    //           { element: <ProductListPage />, index: true },
    //           { path: 'list', element: <ProductListPage /> },
    //           { path: ':id', element: <ProductDetailsPage /> },
    //           { path: 'checkout', element: <ProductCheckoutPage /> },
    //         ],
    //       },
    //       {
    //         path: 'post',
    //         children: [
    //           { element: <PostListPage />, index: true },
    //           { path: 'list', element: <PostListPage /> },
    //           { path: ':title', element: <PostDetailsPage /> },
    //         ],
    //       },
    //     ],
    //   },
    //   {
    //     path: 'pricing',
    //     element: (
    //       <SimpleLayout>
    //         <PricingPage />
    //       </SimpleLayout>
    //     ),
    //   },
    //   {
    //     path: 'payment',
    //     element: (
    //       <SimpleLayout>
    //         <PaymentPage />
    //       </SimpleLayout>
    //     ),
    //   },
    //   {
    //     path: 'coming-soon',
    //     element: (
    //       <SimpleLayout content={{ compact: true }}>
    //         <ComingSoonPage />
    //       </SimpleLayout>
    //     ),
    //   },
    //   {
    //     path: 'maintenance',
    //     element: (
    //       <SimpleLayout content={{ compact: true }}>
    //         <MaintenancePage />
    //       </SimpleLayout>
    //     ),
    //   },
    //   { path: '500', element: <Page500 /> },
    //   { path: '404', element: <Page404 /> },
    //   { path: '403', element: <Page403 /> },
    // ],
  },
];
