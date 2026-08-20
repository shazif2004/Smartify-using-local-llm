type StatsCardsProps = {
  documentsCount: number;
  quizzesCount: number;
  averageScore: number;
};

function StatsCards({
  documentsCount,
  quizzesCount,
  averageScore,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Documents uploaded",
      value: documentsCount,
    },
    {
      label: "Quizzes completed",
      value: quizzesCount,
    },
    {
      label: "Average score",
      value: `${averageScore}%`,
    },
  ];

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="rounded-2xl border border-[#ddd8cb] bg-white p-6 shadow-sm"
        >
          <p className="text-sm font-medium text-[#68736f]">
            {stat.label}
          </p>

          <p className="mt-3 font-serif text-4xl font-bold text-[#102d26]">
            {stat.value}
          </p>
        </article>
      ))}
    </section>
  );
}

export default StatsCards;