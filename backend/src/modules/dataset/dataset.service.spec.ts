import { DatasetService } from './dataset.service';

describe('DatasetService', () => {
  let service: DatasetService;

  beforeEach(() => {
    service = new DatasetService();
  });

  it('should detect array response collections', () => {
    const response = [{ patientId: 'P1' }, { patientId: 'P2' }];
    const result = service.detectCollection(response);
    expect(result.isCollection).toBe(true);
    expect(result.records.length).toBe(2);
  });

  it('should extract records by mode (first, last, firstN)', () => {
    const records = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];

    expect(service.extractRecordByMode(records, 'first')).toEqual([{ id: 1, name: 'Alice' }]);
    expect(service.extractRecordByMode(records, 'last')).toEqual([{ id: 3, name: 'Charlie' }]);
    expect(service.extractRecordByMode(records, 'firstN', { count: 2 })).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });
});
