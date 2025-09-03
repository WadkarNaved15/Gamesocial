import React, { useEffect, useState, useRef } from 'react';
import {
  Image,
  Video,
  FileCode,
  FileText,
  FolderArchive,
  Bold,
  Italic,
  X
} from 'lucide-react';
type UploadedFile = {
  file: File;
  previewUrl: string | null;
};
function AddPost() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"; // Ensure this is set in your .env file
  const [postText, setPostText] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const editorRef = useRef<HTMLDivElement>(null);



  // Refs for different file inputs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle editor content change
  const handleSave = () => {
    const content = editorRef.current?.innerHTML || '';
    console.log('Saved content:', content);
    setShowEditor(false);
  };
  //Handle editor content change
  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.src = reader.result as string;
      img.alt = file.name;
      img.className = 'max-w-full my-2 rounded';

      // Insert image at cursor position
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      if (range) {
        range.deleteContents();
        range.insertNode(img);

        // Move the cursor after the image
        range.setStartAfter(img);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input so user can upload same image again if needed
    e.target.value = '';
  };
  // Handle file selection
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        file,
        previewUrl: file.type.startsWith('image') || file.type.startsWith('video') ? URL.createObjectURL(file) : null,
      }));

      setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  // Remove file from upload list
  const removeFile = (index: number): void => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Handle post submission
  const handlePostSubmit = async (): Promise<void> => {
    if (uploadedFiles.length === 1 && uploadedFiles[0].file.name.endsWith(".zip")) {
      // Handle game upload
      const formData = new FormData();
      formData.append('gamezip', uploadedFiles[0].file);
      formData.append('description', postText);

      try {
        const response = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Game Upload Error:", data.error);
          return;
        }

        console.log("Game uploaded:", data);

        // Reset
        setPostText('');
        setUploadedFiles([]);
        setIsBold(false);
        setIsItalic(false);

      } catch (error) {
        console.error("Game submission error:", error);
      }
    } else {
      // Handle regular post
      const formData = new FormData();
      formData.append("description", postText);

      uploadedFiles.forEach((fileData) => {
        formData.append("media", fileData.file);
      });

      try {
        const res = await fetch(`${BACKEND_URL}/api/posts/create_posts`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Post Error:", data.error);
          return;
        }

        console.log("Post created:", data);

        // Reset
        setPostText('');
        setUploadedFiles([]);
        setIsBold(false);
        setIsItalic(false);

      } catch (error) {
        console.error("Post submission error:", error);
      }
    }
  };


  return (
    <div className="w-full rounded-xl mb-3 dark:bg-gray-800 bg-white text-white flex items-start justify-center p-4">
      <div className="w-full max-w-xl min-h-[150px] dark:bg-gray-800 bg-white">
        {/* Header */}

        {/* Text Input */}
        <div className="min-h-[50px]">
          <textarea
            placeholder="What's happening?"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className={`w-full bg-transparent text-xl outline-none resize-none ${isBold ? 'font-bold' : ''
              } ${isItalic ? 'italic' : ''} text-black dark:text-white placeholder-gray-600`}
            rows={2}
          />
        </div>

        {/* Everyone can reply */}
        <div className="mb-3">
          <button className="text-black dark:text-purple-600 text-sm font-semibold hover:bg-[#1D9BF0]/10 px-3 py-1 rounded-full inline-flex items-center border dark:border-purple-800 border-[#2F3336]">
            <Globe className="w-4 h-4 mr-1" /> Everyone can reply
          </button>
        </div>


        <div className="mt-3 mb-3 grid grid-cols-3 gap-2 flex-wrap max-h-[400px] ">
          {uploadedFiles.map((fileData, index) => (
            <div key={index} className="relative w-fit">
              {fileData.previewUrl ? (
                fileData.file.type.startsWith('image') ? (
                  <img src={fileData.previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <video src={fileData.previewUrl} controls className="w-16 h-16 object-cover rounded-lg" />
                )
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-gray-300 text-black rounded-lg">
                  {fileData.file.type.includes('code') ? (
                    <FileCode className="w-8 h-8" />
                  ) : (
                    <FileText className="w-8 h-8" />
                  )}
                </div>
              )}
              <button
                className="absolute top-[-0.5rem] right-[-0.5rem] bg-slate-400 p-1 rounded-full"
                onClick={() => removeFile(index)}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="border-t border-[#2F3336] pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-black dark:text-purple-600">
            {/* Image Upload */}
            <button className="p-2 hover:bg-purple-600/10 rounded-full" onClick={() => imageInputRef.current?.click()}>
              <Image className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Video Upload */}
            <button className="p-2 hover:bg-purple-600/10 rounded-full" onClick={() => videoInputRef.current?.click()}>
              <Video className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Code Upload */}
            <button className="p-2 hover:bg-purple-600/10 rounded-full" onClick={() => codeInputRef.current?.click()}>
              <FileCode className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept=".js,.html,.css,.json,.tsx,.jsx,.java,.py,.cpp,.cs,.zip"
              ref={codeInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Other File Upload */}
            <button className="p-2 hover:bg-purple-600/10 rounded-full" onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.zip,.rar"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="p-2 hover:bg-purple-600/10 rounded-full"
              onClick={() => setShowEditor(true)}
            >
              <FolderArchive className="w-5 h-5" />
            </button>

            {showEditor && (
              <div className="fixed inset-0 z-50 backdrop-blur-sm bg-white/20">
                <div
                  className="absolute bg-white backdrop-blur-lg rounded-xl p-4 w-[90%] md:w-[70%] lg:w-[50%] shadow-lg flex flex-col"
                  style={{ left: 'calc(100% - 700px)', top: '70px', bottom: '30px' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold">Simple Rich Text Editor</h2>
                    <button className="p-2 hover:bg-purple-600/10 rounded-full" onClick={() => imageInputRef.current?.click()}>
                      <Image className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={imageInputRef}
                      style={{ display: 'none' }}
                      onChange={handleImageInsert}
                    />
                    <button
                      className="text-red-500 font-semibold"
                      onClick={() => setShowEditor(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div
                    contentEditable
                    ref={editorRef}
                    className="flex-grow border rounded p-2 outline-none overflow-auto"
                    style={{
                      minHeight: '400px',
                      paddingBottom: '200px',
                      cursor: 'text',
                      whiteSpace: 'pre-wrap'
                    }}
                    onClick={(e) => {
                      const el = editorRef.current;
                      if (!el) return;

                      // If editor is empty, fill it with one empty paragraph
                      if (el.innerHTML.trim() === '') {
                        el.innerHTML = '<p><br></p>';
                      }

                      let range: Range | null = null;

                      if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(e.clientX, e.clientY);
                      } else if (document.caretPositionFromPoint) {
                        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                        if (pos) {
                          range = document.createRange();
                          range.setStart(pos.offsetNode, pos.offset);
                        }
                      }

                      if (range) {
                        const selection = window.getSelection();
                        if (selection) {
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }
                    }}


                  ></div>

                  {/* <button
                    className="mt-3 bg-purple-600 text-white py-1 px-3 rounded hover:bg-purple-700 self-end"
                    onClick={handleSave}
                  >
                    Save
                  </button> */}
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".zip,.rar"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {/* Text Formatting */}
            <button
              className={`p-2 rounded-full ${isBold ? 'bg-purple-600/20' : 'hover:bg-purple-600/10'}`}
              onClick={() => setIsBold(!isBold)}
            >
              <Bold className="w-5 h-5" />
            </button>
            <button
              className={`p-2 rounded-full ${isItalic ? 'bg-purple-600/20' : 'hover:bg-purple-600/10'}`}
              onClick={() => setIsItalic(!isItalic)}
            >
              <Italic className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow">
            <button className="px-4 py-1 rounded-full border border-[#2F3336] text-black dark:text-purple-600 text-sm font-semibold dark:border-purple-800 hover:bg-[#1D9BF0]/10 transition-colors">
              Everyone ▼
            </button>
          </div>
          <button
            className="bg-purple-600 text-black dark:text-white px-4 py-1.5 rounded-full font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePostSubmit}
            disabled={!postText.trim() && uploadedFiles.length === 0}
          >
            Post
          </button>
        </div>
      </div>

    </div>
  );
}

// Globe icon component
function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export default AddPost;