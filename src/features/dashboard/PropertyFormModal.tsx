import React, { useEffect, useState } from 'react';
import { Property, PropertyStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { formatImageSize } from '@/src/lib/compressPropertyImage';
import { PropertyImageUploadProgress, uploadPropertyImage } from '@/src/lib/cloudinary';
import { Building, Check, Sparkles, Image as ImageIcon, Star, Trash2 } from 'lucide-react';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Property | null;
}

const PRESET_IMAGES = [
  { label: 'Modern Minimalis', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Villa Mewah', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Ruko Komersial', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Tanah Kavling', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Rumah Cluster', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Apartemen/Paviliun', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200' },
];

const JEMBER_DISTRICTS = [
  'Kaliwates',
  'Patrang',
  'Sumbersari',
  'Sukorambi',
  'Ajung',
  'Ambulu',
  'Balung',
  'Bangsalsari',
  'Jenggawah',
  'Kencong',
  'Mayang',
  'Pakusari',
  'Puger',
  'Rambipuji',
  'Semboro',
  'Tanggul',
  'Wuluhan',
];

const getPropertyImages = (property?: Property | null): string[] => {
  const imageUrls = property?.images?.length
    ? property.images
    : property?.image ? [property.image] : [];
  return [...new Set(imageUrls)];
};

interface PendingPropertyImage {
  id: string;
  file: File;
}

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currentUser, isAdmin, isDemoMode } = useAuth();

  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [propertyType, setPropertyType] = useState<Property['property_type']>(
    initialData?.property_type || 'rumah'
  );
  const [listingType, setListingType] = useState<Property['listing_type']>(
    initialData?.listing_type || 'jual'
  );
  const [price, setPrice] = useState<number>(initialData?.price || 500000000);
  const [district, setDistrict] = useState(initialData?.district || 'Kaliwates');
  const [village, setVillage] = useState(initialData?.village || 'Sempusari');
  const [address, setAddress] = useState(initialData?.address || '');
  const [landArea, setLandArea] = useState<number>(initialData?.land_area || 120);
  const [buildingArea, setBuildingArea] = useState<number>(initialData?.building_area || 90);
  const [bedrooms, setBedrooms] = useState<number>(initialData?.bedrooms || 3);
  const [bathrooms, setBathrooms] = useState<number>(initialData?.bathrooms || 2);
  const [floors, setFloors] = useState<number>(initialData?.floors || 1);
  const [parkingSpaces, setParkingSpaces] = useState<number>(initialData?.parking_spaces || 1);
  const [image, setImage] = useState(initialData?.image || (isDemoMode ? PRESET_IMAGES[0].url : ''));
  const [existingImages, setExistingImages] = useState<string[]>(() => getPropertyImages(initialData));
  const [pendingImages, setPendingImages] = useState<PendingPropertyImage[]>([]);
  const [primaryImageKey, setPrimaryImageKey] = useState<string | null>(() => {
    const firstImage = getPropertyImages(initialData)[0];
    return firstImage ? `existing:${firstImage}` : null;
  });
  const [pendingImagePreviews, setPendingImagePreviews] = useState<Record<string, string>>({});
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [compressionSummary, setCompressionSummary] = useState<string | null>(null);

  useEffect(() => {
    const previews = pendingImages.map(({ id, file }) => [id, URL.createObjectURL(file)] as const);
    setPendingImagePreviews(Object.fromEntries(previews));
    return () => previews.forEach(([, previewUrl]) => URL.revokeObjectURL(previewUrl));
  }, [pendingImages]);

  useEffect(() => {
    if (!isOpen) return;
    const storedImages = getPropertyImages(initialData);
    setExistingImages(storedImages);
    setPendingImages([]);
    setPrimaryImageKey(storedImages[0] ? `existing:${storedImages[0]}` : null);
    setCompressionSummary(null);
    setError(null);
  }, [isOpen, initialData?.id]);

  const galleryItems = [
    ...existingImages.map(url => ({ key: `existing:${url}`, url, file: null as File | null })),
    ...pendingImages.map(({ id, file }) => ({
      key: `pending:${id}`,
      url: pendingImagePreviews[id] || '',
      file,
    })),
  ];
  const orderedGalleryItems = [
    ...galleryItems.filter(item => item.key === primaryImageKey),
    ...galleryItems.filter(item => item.key !== primaryImageKey),
  ];

  const removeGalleryItem = (key: string) => {
    if (key.startsWith('existing:')) {
      const url = key.slice('existing:'.length);
      setExistingImages(images => images.filter(imageUrl => imageUrl !== url));
    } else {
      const id = key.slice('pending:'.length);
      setPendingImages(files => files.filter(item => item.id !== id));
    }

    if (primaryImageKey === key) {
      const nextItem = galleryItems.find(item => item.key !== key);
      setPrimaryImageKey(nextItem?.key || null);
    }
    setCompressionSummary(null);
  };

  if (!isOpen) return null;

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (targetStatus: PropertyStatus) => {
    if (!title.trim() || !address.trim() || !description.trim()) {
      alert('Mohon lengkapi Judul, Alamat, dan Deskripsi properti.');
      return;
    }

    const slug = isEditing
      ? initialData.slug
      : `${generateSlug(title)}-${Math.floor(1000 + Math.random() * 9000)}`;

    setError(null);
    setUploadStatus(pendingImages.length > 0 && !isDemoMode ? 'Mengompres gambar...' : 'Menyimpan listing...');
    setIsSaving(true);
    let warning: string | undefined;
    try {
      const uploadedImages = new Map<string, string>();
      const uploadableItems = orderedGalleryItems.filter(item => item.file);
      const compressionSummaries: string[] = [];

      if (!isDemoMode) {
        for (const [index, item] of uploadableItems.entries()) {
          const file = item.file;
          if (!file) continue;

          try {
            const imageUrl = await uploadPropertyImage(file, (progress: PropertyImageUploadProgress) => {
              const stage = progress.stage === 'compressing' ? 'Mengompres' : 'Mengunggah';
              setUploadStatus(`${stage} foto ${index + 1} dari ${uploadableItems.length}...`);
              if (progress.stage === 'uploading') {
                const { compression } = progress;
                const format = compression.file.type === 'image/webp' ? 'WebP' : 'JPEG';
                const transparencyNote = compression.transparencyFlattened
                  ? ' (transparansi diratakan dengan latar putih)'
                  : '';
                compressionSummaries[index] =
                  `${file.name}: ${formatImageSize(compression.originalSize)} → ${formatImageSize(compression.file.size)} ${format}${transparencyNote}`;
                setCompressionSummary(compressionSummaries.join(' · '));
              }
            });
            uploadedImages.set(item.key, imageUrl);
          } catch (uploadError) {
            throw new Error(
              `File "${file.name}": ${uploadError instanceof Error ? uploadError.message : 'Gagal diproses atau diunggah.'}`,
              { cause: uploadError }
            );
          }
        }
      }

      const propertyImages = isDemoMode
        ? image ? [image] : []
        : orderedGalleryItems
          .map(item => item.file ? uploadedImages.get(item.key) : item.url)
          .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
      const propertyImage = isDemoMode ? image : propertyImages[0] || '';

      if (isEditing && initialData) {
        const updates = {
          title,
          property_type: propertyType,
          listing_type: listingType,
          price,
          district,
          village,
          address,
          land_area: landArea,
          building_area: buildingArea,
          bedrooms,
          bathrooms,
          floors,
          parking_spaces: parkingSpaces,
          image: propertyImage,
          images: propertyImages,
          description,
          status: targetStatus,
          rejection_reason: undefined,
        };
        if (isDemoMode) {
          propertyRepository.update(initialData.id, updates, currentUser);
        } else {
          const result = await propertyRepository.updateAsync(initialData.id, updates, currentUser);
          warning = result.warning;
        }
      } else {
        const newProp: Property = {
          id: `prop-${Date.now()}`,
          owner_agent_id: currentUser.id,
          title,
          slug,
          property_type: propertyType,
          listing_type: listingType,
          price,
          province: 'Jawa Timur',
          city: 'Jember',
          district,
          village,
          address,
          land_area: landArea,
          building_area: buildingArea,
          bedrooms,
          bathrooms,
          floors,
          parking_spaces: parkingSpaces,
          image: propertyImage,
          images: propertyImages,
          description,
          status: targetStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (isDemoMode) {
          propertyRepository.create(newProp, currentUser);
        } else {
          const result = await propertyRepository.createAsync(newProp, currentUser);
          warning = result.warning;
        }
      }

      onSuccess();
      onClose();
      if (warning) alert(warning);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Listing gagal disimpan.';
      setError(message);
    } finally {
      setIsSaving(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-[#E8E5DD] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#142544] text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isEditing ? 'Edit Listing Properti' : 'Tambah Listing Baru'}
            </h2>
            <p className="text-xs text-[#D8C596]">
              {isEditing ? `ID: ${initialData?.id}` : `Agen Pemilik: ${currentUser.full_name} (${currentUser.role})`}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#142544]">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#B49453] uppercase tracking-wider">
              1. Informasi Pokok
            </h3>

            <div>
              <label className="block font-semibold mb-1">Judul Properti *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Rumah Modern Minimalis 2 Lantai Cluster Kaliwates"
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453] focus:border-[#B49453]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Jenis Properti</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                >
                  <option value="rumah">Rumah</option>
                  <option value="tanah">Tanah</option>
                  <option value="ruko">Ruko</option>
                  <option value="apartemen">Apartemen / Studio</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Jenis Transaksi</label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                >
                  <option value="jual">Dijual</option>
                  <option value="sewa">Disewakan</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Harga (Rupiah)</label>
                <input
                  type="number"
                  step="1000000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
                <span className="text-[10px] text-[#B49453] font-semibold mt-1 block">
                  Rp {price.toLocaleString('id-ID')} {listingType === 'sewa' ? '/tahun' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
            <h3 className="text-xs font-bold text-[#B49453] uppercase tracking-wider">
              2. Lokasi di Jember
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Kecamatan</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                >
                  {JEMBER_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Kelurahan / Desa</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Contoh: Gebang, Sempusari, Mangli..."
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Alamat Lengkap *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Danau Toba No. 18, Perum Patrang Asri, Jember"
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                required
              />
            </div>
          </div>

          {/* Specs */}
          <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
            <h3 className="text-xs font-bold text-[#B49453] uppercase tracking-wider">
              3. Spesifikasi Teknis
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="block font-semibold mb-1">LT (m²)</label>
                <input
                  type="number"
                  value={landArea}
                  onChange={(e) => setLandArea(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">LB (m²)</label>
                <input
                  type="number"
                  value={buildingArea}
                  onChange={(e) => setBuildingArea(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">KT</label>
                <input
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">KM</label>
                <input
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Lantai</label>
                <input
                  type="number"
                  value={floors}
                  onChange={(e) => setFloors(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Carport</label>
                <input
                  type="number"
                  value={parkingSpaces}
                  onChange={(e) => setParkingSpaces(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-center"
                />
              </div>
            </div>
          </div>

          {/* Photo & Description */}
          <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
            <h3 className="text-xs font-bold text-[#B49453] uppercase tracking-wider">
              4. Foto & Deskripsi Lengkap
            </h3>

            <div>
              <label className="block font-semibold mb-1">
                {isDemoMode ? 'Pilih Foto Cepat / URL Gambar' : 'Upload Foto Properti (opsional)'}
              </label>
              {isDemoMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => {
                        setImage(preset.url);
                        setExistingImages([]);
                        setPendingImages([]);
                        setPrimaryImageKey(null);
                        setCompressionSummary(null);
                      }}
                      className={`relative rounded-lg overflow-hidden border-2 text-left h-16 group ${
                        image === preset.url ? 'border-[#B49453] ring-2 ring-[#B49453]' : 'border-transparent'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-black/40 flex items-end p-1 text-[10px] text-white font-medium">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {isDemoMode ? (
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              ) : (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#B49453] bg-[#F8F7F3] px-4 py-5 text-xs font-semibold text-[#142544] hover:bg-[#B49453]/10">
                    <ImageIcon className="h-4 w-4 text-[#B49453]" />
                    <span>Tambah foto dari perangkat</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={isSaving}
                      onChange={(event) => {
                        const selectedFiles = Array.from(event.currentTarget.files || []);
                        event.currentTarget.value = '';
                        const validFiles: PendingPropertyImage[] = [];
                        const fileErrors: string[] = [];
                        for (const selectedFile of selectedFiles) {
                          if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
                            fileErrors.push(`${selectedFile.name}: pilih JPG, PNG, atau WebP.`);
                          } else if (selectedFile.size > 10 * 1024 * 1024) {
                            fileErrors.push(`${selectedFile.name}: ukuran foto asli maksimal 10 MB.`);
                          } else {
                            validFiles.push({ id: crypto.randomUUID(), file: selectedFile });
                          }
                        }
                        if (validFiles.length > 0) {
                          setPendingImages(images => [...images, ...validFiles]);
                          if (!primaryImageKey && existingImages.length === 0 && pendingImages.length === 0) {
                            setPrimaryImageKey(`pending:${validFiles[0].id}`);
                          }
                        }
                        setError(fileErrors.length > 0 ? fileErrors.join(' ') : null);
                        setCompressionSummary(null);
                      }}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-[10px] text-[#6B7280]">
                    Pilih satu atau beberapa foto. JPG, PNG, atau WebP hingga 10 MB per foto; setiap foto dikompres maksimal 400 KB sebelum diunggah.
                  </p>
                  {orderedGalleryItems.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {orderedGalleryItems.map((item, index) => (
                        <div key={item.key} className="overflow-hidden rounded-xl border border-[#E8E5DD] bg-white">
                          <div className="relative h-28 bg-[#142544]">
                            {item.url && (
                              <img src={item.url} alt={`Foto properti ${index + 1}`} className="h-full w-full object-cover" />
                            )}
                            {primaryImageKey === item.key && (
                              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#B49453] px-2 py-1 text-[9px] font-bold text-[#0B1730]">
                                <Star className="h-3 w-3 fill-current" /> Foto utama
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => removeGalleryItem(item.key)}
                              aria-label={`Hapus foto ${index + 1}`}
                              className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-rose-700 shadow-sm disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 p-2">
                            <span className="truncate text-[10px] text-[#6B7280]" title={item.file?.name || item.url}>
                              {item.file?.name || `Foto tersimpan ${existingImages.indexOf(item.url) + 1}`}
                            </span>
                            {primaryImageKey !== item.key && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => setPrimaryImageKey(item.key)}
                                className="shrink-0 text-[9px] font-semibold text-[#80652F] hover:underline disabled:opacity-50"
                              >
                                Jadikan utama
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploadStatus && (
                    <p role="status" aria-live="polite" className="text-[11px] font-semibold text-[#142544]">
                      {uploadStatus}
                    </p>
                  )}
                  {compressionSummary && (
                    <p role="status" className="text-[11px] text-emerald-700">
                      {compressionSummary}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-1">Deskripsi Lengkap *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan spesifikasi detail keunggulan, legalitas (SHM/IMB), akses jalan, fasilitas sekitar..."
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                required
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F8F7F3] border-t border-[#E8E5DD] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => void handleSubmit('draft')}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white border border-[#142544] text-[#142544] hover:bg-[#142544]/5 text-xs font-bold"
            >
              {isSaving ? (uploadStatus || 'Menyimpan...') : 'Simpan sebagai Draf'}
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit('pending_review')}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#B49453] hover:bg-[#D8C596] text-[#142544] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ajukan Review</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => void handleSubmit('published')}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-[#B49453]" />
                <span>Terbitkan Langsung</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
