import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = {
  content: string;
};

function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-8 mb-4 text-4xl font-bold">
            {children}
          </h1>
        ),

        h2: ({ children }) => (
          <h2 className="mt-7 mb-3 text-3xl font-bold">
            {children}
          </h2>
        ),

        h3: ({ children }) => (
          <h3 className="mt-6 mb-2 text-2xl font-semibold">
            {children}
          </h3>
        ),

        p: ({ children }) => (
          <p className="mb-4 leading-8">
            {children}
          </p>
        ),

        ul: ({ children }) => (
          <ul className="mb-5 list-disc pl-6">
            {children}
          </ul>
        ),

        ol: ({ children }) => (
          <ol className="mb-5 list-decimal pl-6">
            {children}
          </ol>
        ),

        li: ({ children }) => (
          <li className="mb-2">
            {children}
          </li>
        ),

        strong: ({ children }) => (
          <strong className="font-bold">
            {children}
          </strong>
        ),

        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1 py-0.5">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;