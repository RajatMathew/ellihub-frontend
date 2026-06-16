import { Link, Outlet } from 'react-router-dom';

import { Card, CardContent } from '@app/components/ui/card';
import { toAbsoluteUrl } from '@app/lib/helpers';

export function BrandedLayout() {
  return (
    <div className="flex grow bg-background">
      <style>
        {`
          .branded-bg {
            background-image: url('https://images.unsplash.com/photo-1625821078599-3feef40d1714?q=80&w=2426&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
          }
        `}
      </style>
      <div className="grid lg:grid-cols-2 grow h-screen">
        <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <Outlet />
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:flex lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat branded-bg">
          <div className="flex flex-col p-8 lg:p-16 gap-4">
            <Link to="/">
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="h-7 max-w-none"
                alt=""
              />
            </Link>

            <div className="flex flex-col gap-3 dark:text-black">
              <h3 className="text-2xl font-semibold text-mono">Secure Project Management</h3>
              <div className="text-base font-medium text-secondary-foreground dark:text-gray-500">
                A robust authentication gateway ensuring
                <br /> secure&nbsp;
                <span className="text-mono font-semibold">efficient team access</span>
                &nbsp;to the Construction ERP
                <br /> Management platform.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
