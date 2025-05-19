import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, Edit, Trash2, Calendar, Package, ShoppingBag, 
  ArrowUpRight, FileText, Clock, ExternalLink
} from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { Feed } from '../types/feed';

const Dashboard = () => {
  const { feeds, deleteFeed, setCurrentFeed } = useFeed();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedToDelete, setFeedToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const handleImportClick = () => {
    navigate('/import');
  };
  
  const handleEditFeed = (feedId: string) => {
    setCurrentFeed(feedId);
    navigate(`/feeds/${feedId}`);
  };
  
  const confirmDeleteFeed = (feedId: string) => {
    setFeedToDelete(feedId);
    setIsDeleteModalOpen(true);
  };
  
  const handleDeleteFeed = () => {
    if (feedToDelete) {
      deleteFeed(feedToDelete);
      setIsDeleteModalOpen(false);
      setFeedToDelete(null);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const renderFeedCards = () => {
    if (feeds.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 mt-8 text-center bg-white rounded-lg shadow-sm">
          <FileText className="w-16 h-16 mb-4 text-gray-300" />
          <h3 className="mb-2 text-xl font-medium text-gray-900">No feeds found</h3>
          <p className="mb-6 text-gray-500">Import a YML feed to get started with managing your product data.</p>
          <button
            onClick={handleImportClick}
            className="flex items-center px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UploadCloud className="w-5 h-5 mr-2" />
            Import Feed
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
        {feeds.map((feed) => (
          <FeedCard 
            key={feed.id} 
            feed={feed} 
            onEdit={() => handleEditFeed(feed.id)} 
            onDelete={() => confirmDeleteFeed(feed.id)}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">YML Feed Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage and optimize your product feed data
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStat 
          title="Total Feeds" 
          value={feeds.length.toString()} 
          icon={<FileText className="w-5 h-5 text-orange-500" />}
          color="bg-orange-100"
        />
        <DashboardStat 
          title="Total Products" 
          value={feeds.reduce((sum, feed) => sum + feed.products.length, 0).toString()} 
          icon={<Package className="w-5 h-5 text-blue-500" />}
          color="bg-blue-100"
        />
        <DashboardStat 
          title="Categories" 
          value={feeds.reduce((sum, feed) => sum + feed.categories.length, 0).toString()} 
          icon={<ShoppingBag className="w-5 h-5 text-green-500" />}
          color="bg-green-100"
        />
        <DashboardStat 
          title="Last Updated" 
          value={feeds.length > 0 ? formatDate(feeds[0].dateModified) : 'Invalid Date'} 
          icon={<Clock className="w-5 h-5 text-purple-500" />}
          color="bg-purple-100"
        />
      </div>
      
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900">Your Feeds</h3>
        {renderFeedCards()}
      </div>
      
      {/* Import Feed Button (Mobile) */}
      <div className="md:hidden mt-8 flex justify-center">
        <button
          onClick={handleImportClick}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          Import New Feed
        </button>
      </div>
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Confirm Delete</h3>
            <p className="mb-5 text-sm text-gray-500">
              Are you sure you want to delete this feed? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFeed}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedCard = ({ 
  feed, onEdit, onDelete 
}: { 
  feed: Feed, 
  onEdit: () => void, 
  onDelete: () => void 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className="overflow-hidden transition-shadow bg-white rounded-lg shadow-sm hover:shadow-md">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{feed.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
              aria-label="Edit feed"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
              aria-label="Delete feed"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center mt-3 space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Created: {formatDate(feed.dateCreated)}</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Products</span>
            <span className="text-sm font-medium text-gray-900">{feed.products.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Categories</span>
            <span className="text-sm font-medium text-gray-900">{feed.categories.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Version</span>
            <span className="text-sm font-medium text-gray-900">{feed.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${feed.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {feed.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
        {feed.isPublished && feed.publishedUrl && (
          <div className="mt-3">
            <a 
              href={feed.publishedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View Published Feed
            </a>
          </div>
        )}
        <button
          onClick={onEdit}
          className="flex items-center justify-center w-full px-4 py-2 mt-5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          View and Edit
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

const DashboardStat = ({ 
  title, value, icon, color 
}: { 
  title: string, 
  value: string, 
  icon: React.ReactNode,
  color: string
}) => {
  return (
    <div className="p-5 overflow-hidden bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;