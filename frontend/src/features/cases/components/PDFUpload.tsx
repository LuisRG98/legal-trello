
import { useRef, useState } from "react";
import { useUploadPDFs } from "../hooks/useCases";

export default function PDFUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const uploadMutation = useUploadPDFs();

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setFiles(Array.from(event.target.files ?? []));
  }

  function handleUpload() {
    if (files.length === 0 || uploadMutation.isPending) {
      return;
    }

    uploadMutation.mutate(files, {
      onSuccess: () => {
        setFiles([]);

        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-semibold text-slate-800">
          Create cases from PDFs
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select one or more PDF documents. Each valid PDF
          creates a new case.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />

        <button
          type="button"
          disabled={files.length === 0 || uploadMutation.isPending}
          onClick={handleUpload}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending
            ? "Uploading..."
            : `Upload ${files.length || ""} PDF${files.length === 1 ? "" : "s"}`}
        </button>
      </div>

      {files.length > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          {files.length} file(s) selected.
        </p>
      )}

      {uploadMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          The upload request failed. Please try again.
        </p>
      )}

      {uploadMutation.data && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="font-medium text-slate-800">
            Upload results
          </p>

          <p className="mt-1 text-sm text-emerald-700">
            Successful: {uploadMutation.data.succeeded}
          </p>

          <p className="text-sm text-red-600">
            Failed: {uploadMutation.data.failed}
          </p>

          <ul className="mt-3 space-y-2">
            {uploadMutation.data.results.map((result, index) => (
              <li
                key={`${result.filename}-${index}`}
                className="border-t border-slate-200 pt-2 text-sm"
              >
                <p className="font-medium text-slate-700">
                  {result.filename}
                </p>

                <p className={
                  result.success
                    ? "text-emerald-700"
                    : "text-red-600"
                }>
                  {result.message}
                </p>

                {result.case_number && (
                  <p className="text-slate-500">
                    Case: {result.case_number}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
