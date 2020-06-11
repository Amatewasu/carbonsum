import { TestBed } from '@angular/core/testing';

import { EcologyToolsService } from './ecology-tools.service';

describe('EcologyToolsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: EcologyToolsService = TestBed.get(EcologyToolsService);
    expect(service).toBeTruthy();
  });
});
