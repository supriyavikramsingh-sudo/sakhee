interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PageHeader = ({ title, description, icon }: PageHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="flex gap-2 items-center">
        <div className="border-[3px] rounded-full border-primary p-4">{icon}</div>
        <div>
          <h1 className="text-4xl font-bold text-primary mb-1">{title}</h1>
          <p className="text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
