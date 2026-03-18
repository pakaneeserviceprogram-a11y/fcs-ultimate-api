import { Test, TestingModule } from '@nestjs/testing';
import { CardsnpxController } from './cardsnpx.controller';

describe('CardsnpxController', () => {
  let controller: CardsnpxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardsnpxController],
    }).compile();

    controller = module.get<CardsnpxController>(CardsnpxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
