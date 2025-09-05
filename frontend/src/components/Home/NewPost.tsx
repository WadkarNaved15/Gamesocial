import React, { useState } from 'react';

interface AddPostProps {
  onCancel: () => void;
}


const CreatePost = ({ onCancel }: AddPostProps) => {
  const [gameTitle, setGameTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isHeavyGame, setIsHeavyGame] = useState<boolean>(false);
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGameFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      gameTitle,
      description,
      isHeavyGame,
      gameFile,
      coverImage,
    });
    alert('Post created successfully! (This is a placeholder)');
  };

  return (
    <div className="min-h-screen  text-white flex items-center justify-center py-12">
      <div className="bg-gray-900 bg-opacity-70 p-8 rounded-lg shadow-xl max-w-2xl w-full backdrop-blur-sm border border-[#3D7A6E]">
        <button
  type="button"
  onClick={onCancel}
  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 
             transition-colors duration-200"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>

        <h2 className="text-3xl font-bold text-center mb-8 text-white">Create a Game Post</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="gameTitle" className="block text-sm font-medium text-gray-200">
              Game Title
            </label>
            <input
              type="text"
              id="gameTitle"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-[#0A1714] border border-[#1F4D44] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3D7A6E] focus:border-[#3D7A6E] text-white"
              placeholder="e.g., The Last of Us Part II"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-200">
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-[#0A1714] border border-[#1F4D44] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3D7A6E] focus:border-[#3D7A6E] text-white"
              placeholder="Provide a detailed description of the game, its features, and system requirements."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="gameFile" className="block text-sm font-medium text-gray-200">
                Upload Game File (.zip, .rar, etc.)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#1F4D44] border-dashed rounded-md cursor-pointer hover:border-[#3D7A6E] transition-colors">
                <input
                  id="gameFile"
                  name="gameFile"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <label htmlFor="gameFile" className="text-center w-full">
                  {gameFile ? (
                    <p className="text-sm text-[#3D7A6E] truncate">{gameFile.name}</p>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-[#1F4D44]"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-8m32-8l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m-4-4l-4 4m4-4V28M8 32h8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="mt-2 block text-sm font-medium text-[#1F4D44]">
                        Drag and drop or{' '}
                        <span className="text-[#3D7A6E] hover:text-[#589C92]">
                          browse
                        </span>{' '}
                        a file
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="coverImage" className="block text-sm font-medium text-gray-200">
                Upload Cover Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[#1F4D44] border-dashed rounded-md cursor-pointer hover:border-[#3D7A6E] transition-colors">
                <input
                  id="coverImage"
                  name="coverImage"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                />
                <label htmlFor="coverImage" className="text-center w-full">
                  {coverImage ? (
                    <p className="text-sm text-[#3D7A6E] truncate">{coverImage.name}</p>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-[#1F4D44]"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-8m32-8l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m-4-4l-4 4m4-4V28M8 32h8"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="mt-2 block text-sm font-medium text-[#1F4D44]">
                        Drag and drop or{' '}
                        <span className="text-[#3D7A6E] hover:text-[#589C92]">
                          browse
                        </span>{' '}
                        an image
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-medium text-gray-200">Is it a heavy game (over 1 GB)?</span>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                name="isHeavyGame"
                id="isHeavyGame"
                checked={isHeavyGame}
                onChange={() => setIsHeavyGame(!isHeavyGame)}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out peer"
              />
              <label htmlFor="isHeavyGame" className="toggle-label block overflow-hidden h-6 rounded-full bg-[#1F4D44] cursor-pointer peer-checked:bg-[#1F4D44]"></label>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full px-4 py-3 bg-[#3D7A6E] text-white font-semibold rounded-md shadow-lg hover:bg-[#589C92] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D7A6E]"
            >
              Create Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;