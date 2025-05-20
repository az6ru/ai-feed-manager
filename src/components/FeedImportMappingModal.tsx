import React, { useState, useEffect } from 'react';
import Modal from './layout/Modal';

interface FeedImportMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mapping: Record<string, string>) => void;
  exampleOffer: Record<string, any>;
  productFields: string[];
  initialMapping?: Record<string, string>;
  diffPreview?: React.ReactNode;
}

const fieldLabels: Record<string, string> = {
  id: 'ID',
  name: 'Название',
  description: 'Описание',
  price: 'Цена',
  oldPrice: 'Старая цена',
  currency: 'Валюта',
  categoryId: 'ID категории',
  url: 'URL',
  picture: 'Изображения',
  available: 'В наличии',
  vendor: 'Производитель',
  vendorCode: 'Артикул',
  // ... можно добавить другие поля
};

const FeedImportMappingModal: React.FC<FeedImportMappingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  exampleOffer,
  productFields,
  initialMapping = {},
  diffPreview,
}) => {
  const offerFields = Object.keys(exampleOffer || {});
  // useEffect для сброса mapping при изменении initialMapping
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  useEffect(() => {
    setMapping(initialMapping);
  }, [initialMapping]);

  const handleMappingChange = (productField: string, offerField: string) => {
    setMapping((prev) => ({ ...prev, [productField]: offerField }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Маппинг полей и анализ структуры"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Отмена</button>
          <button
            onClick={() => onConfirm(mapping)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Импортировать с этим маппингом
          </button>
        </div>
      }
    >
      <div className="max-h-[80vh] overflow-y-auto">
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Пример исходного оффера</h4>
          <pre className="bg-gray-50 p-3 rounded border text-xs max-h-48 overflow-auto">
            {JSON.stringify(exampleOffer, null, 2)}
          </pre>
        </div>
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Маппинг полей</h4>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border">Поле в Product</th>
                  <th className="p-1 border">Поле в оффере</th>
                  <th className="p-1 border">Пример значения</th>
                </tr>
              </thead>
              <tbody>
                {productFields.map((productField) => (
                  <tr key={productField}>
                    <td className="p-1 border font-medium">
                      {fieldLabels[productField] || productField}
                    </td>
                    <td className="p-1 border">
                      <select
                        className="border rounded px-2 py-1"
                        value={mapping[productField] || ''}
                        onChange={(e) => handleMappingChange(productField, e.target.value)}
                      >
                        <option value="">—</option>
                        {offerFields.map((offerField) => (
                          <option key={offerField} value={offerField}>
                            {offerField}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 border text-gray-600 whitespace-pre-line break-words" title={
                      exampleOffer[mapping[productField] || productField] !== undefined
                        ? String(exampleOffer[mapping[productField] || productField])
                        : undefined
                    }>
                      {exampleOffer[mapping[productField] || productField] !== undefined
                        ? String(exampleOffer[mapping[productField] || productField])
                        : <span className="text-red-500">нет значения</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FeedImportMappingModal; 