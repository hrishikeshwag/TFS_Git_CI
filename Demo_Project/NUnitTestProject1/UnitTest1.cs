using NUnit.Framework;

namespace Tests
{
    public class Tests
    {
        [SetUp]
        public void Setup()
        {
        }

        [Test]
        public void Test1()
        {
            Demo_Project.Program d = new Demo_Project.Program();
            int i = d.add(8, 6);
            Assert.AreEqual(14, i);
        }
    }
}