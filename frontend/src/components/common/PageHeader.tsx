interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader = ({ title, description, icon, children }: PageHeaderProps) => {
  return (
    <div className="flex justify-between items-center rounded-t-lg px-6 py-10 shadow-md border-b border-gray-200 bg-[url('/images/header-bg.png')] bg-cover bg-no-repeat">
      <div className="flex gap-2 items-center">
        <div className="border-[3px] rounded-full border-primary p-4">{icon}</div>
        <div className="text-neutral-500">
          <h1 className="text-4xl font-bold mb-1">{title}</h1>
          <p className="ml-1">{description}</p>
        </div>
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
};

export default PageHeader;
