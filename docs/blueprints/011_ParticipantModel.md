[<- Back to Index](./000_master_blueprint.md)

# Blueprint: ParticipantModel.js

**Objective:** To encapsulate the business logic for fetching and managing participant data.

**Test Specification:** `tests/models/ParticipantModel.test.js`

```javascript
import { ParticipantModel } from '../../js/models/ParticipantModel.js';
import { NotionService } from '../../js/services/NotionService.js';
import { StateManager } from '../../js/core/StateManager.js';
import { expect } from '../../js/testing/expect.js';
import { describe, it, beforeEach, mockFn } from '../../js/testing/veritas.js';

jest.mock('../../js/services/NotionService.js');
jest.mock('../../js/core/StateManager.js');

describe('ParticipantModel', () => {
  let participantModel;
  let mockNotionService;
  let mockStateManager;

  beforeEach(() => {
    NotionService.mockClear();
    StateManager._resetInstance();

    participantModel = new ParticipantModel();
    mockNotionService = NotionService.mock.instances[0];
    mockStateManager = StateManager.getInstance();
  });

  describe('fetchParticipantCount()', () => {
    it('should call NotionService.getParticipantCount()', async () => {
      mockNotionService.getParticipantCount.mockResolvedValue(215);
      await participantModel.fetchParticipantCount();
      expect(mockNotionService.getParticipantCount).toHaveBeenCalled();
    });

    it('should update the StateManager with the fetched count', async () => {
      const fakeCount = 250;
      mockNotionService.getParticipantCount.mockResolvedValue(fakeCount);
      await participantModel.fetchParticipantCount();
      expect(mockStateManager.set).toHaveBeenCalledWith('stats.participantCount', fakeCount);
    });

    it('should return the fetched count', async () => {
      const fakeCount = 300;
      mockNotionService.getParticipantCount.mockResolvedValue(fakeCount);
      const count = await participantModel.fetchParticipantCount();
      expect(count).toBe(fakeCount);
    });
  });

  describe('fetchRecentSignups()', () => {
    it('should call NotionService.getRecentParticipants with a default limit', async () => {
      mockNotionService.getRecentParticipants.mockResolvedValue([]);
      await participantModel.fetchRecentSignups();
      expect(mockNotionService.getRecentParticipants).toHaveBeenCalledWith({ limit: 10 });
    });

    it('should update the StateManager with the list of recent signups', async () => {
      const fakeSignups = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      mockNotionService.getRecentParticipants.mockResolvedValue(fakeSignups);
      await participantModel.fetchRecentSignups();
      expect(mockStateManager.set).toHaveBeenCalledWith('feed.recentSignups', fakeSignups);
    });
  });
});
```
