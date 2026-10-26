import React, { useState } from 'react';
import { Property, PropertyStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { X, Building, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

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

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { currentUser, isAdmin } = useAuth();

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
  const [image, setImage] = useState(initialData?.image || PRESET_IMAGES[0].url);
  const [description, setDescription] = useState(initialData?.description || '');

  if (!isOpen) return null;

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = (targetStatus: PropertyStatus) => {
    if (!title.trim() || !address.trim() || !description.trim()) {
      alert('Mohon lengkapi Judul, Alamat, dan Deskripsi properti.');
      return;
    }

    const slug = isEditing
      ? initialData.slug
      : `${generateSlug(title)}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isEditing && initialData) {
      propertyRepository.update(
        initialData.id,
        {
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
          image,
          description,
          status: targetStatus,
        },
        currentUser
      );
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
        image,
        description,
        status: targetStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      propertyRepository.create(newProp, currentUser);
    }

    onSuccess();
    onClose();
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
            <p className="text-xs text-[#E0C477]">
              {isEditing ? `ID: ${initialData?.id}` : `Agen Pemilik: ${currentUser.full_name} (${currentUser.role})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#142544]">
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#C9A34E] uppercase tracking-wider">
              1. Informasi Pokok
            </h3>

            <div>
              <label className="block font-semibold mb-1">Judul Properti *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Rumah Modern Minimalis 2 Lantai Cluster Kaliwates"
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E] focus:border-[#C9A34E]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Jenis Properti</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
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
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
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
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                />
                <span className="text-[10px] text-[#C9A34E] font-semibold mt-1 block">
                  Rp {price.toLocaleString('id-ID')} {listingType === 'sewa' ? '/tahun' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
            <h3 className="text-xs font-bold text-[#C9A34E] uppercase tracking-wider">
              2. Lokasi di Jember
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Kecamatan</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
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
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
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
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                required
              />
            </div>
          </div>

          {/* Specs */}
          <div className="space-y-4 pt-4 border-t border-[#E8E5DD]">
            <h3 className="text-xs font-bold text-[#C9A34E] uppercase tracking-wider">
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
            <h3 className="text-xs font-bold text-[#C9A34E] uppercase tracking-wider">
              4. Foto & Deskripsi Lengkap
            </h3>

            <div>
              <label className="block font-semibold mb-1">Pilih Foto Cepat / URL Gambar</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`relative rounded-lg overflow-hidden border-2 text-left h-16 group ${
                      image === preset.url ? 'border-[#C9A34E] ring-2 ring-[#C9A34E]' : 'border-transparent'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 flex items-end p-1 text-[10px] text-white font-medium">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Deskripsi Lengkap *</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan spesifikasi detail keunggulan, legalitas (SHM/IMB), akses jalan, fasilitas sekitar..."
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                required
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F8F7F3] border-t border-[#E8E5DD] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E8E5DD] text-[#6B7280] hover:bg-white text-xs font-semibold"
          >
            Batal
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white border border-[#142544] text-[#142544] hover:bg-[#142544]/5 text-xs font-bold"
            >
              Simpan sebagai Draf
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('pending_review')}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#C9A34E] hover:bg-[#E0C477] text-[#142544] text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ajukan Review</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-[#C9A34E]" />
                <span>Terbitkan Langsung</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
