import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderTreeComponent } from './folder-tree.component';

describe('FolderTreeComponent', () => {
  let component: FolderTreeComponent;
  let fixture: ComponentFixture<FolderTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FolderTreeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FolderTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
