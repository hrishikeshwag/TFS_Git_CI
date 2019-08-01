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
            Sud_Project.Program d = new Sud_Project.Program();
            int i = d.sub(8, 6);
            Assert.AreEqual(2, i);
        }
    }
}